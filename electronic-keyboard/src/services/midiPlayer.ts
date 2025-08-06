import { Midi } from '@tonejs/midi';
import * as Tone from 'tone';

// 预定义音色配置
export interface InstrumentConfig {
  id: string;
  name: string;
  oscillator: any;
  envelope: any;
  filter?: any;
}

export const INSTRUMENTS: InstrumentConfig[] = [
  {
    id: 'piano',
    name: '钢琴',
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 }
  },
  {
    id: 'organ',
    name: '管风琴',
    oscillator: { type: 'square' },
    envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.5 }
  },
  {
    id: 'guitar',
    name: '吉他',
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 2 }
  },
  {
    id: 'violin',
    name: '小提琴',
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.1, decay: 0.1, sustain: 0.8, release: 1.5 }
  },
  {
    id: 'flute',
    name: '长笛',
    oscillator: { type: 'sine' },
    envelope: { attack: 0.05, decay: 0.05, sustain: 0.9, release: 1 }
  },
  {
    id: 'trumpet',
    name: '小号',
    oscillator: { type: 'square' },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.8 }
  },
  {
    id: 'bass',
    name: '贝斯',
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.02, decay: 0.4, sustain: 0.3, release: 1.2 }
  },
  {
    id: 'pad',
    name: '合成垫音',
    oscillator: { type: 'sine' },
    envelope: { attack: 0.8, decay: 0.2, sustain: 0.8, release: 2 }
  }
];

export interface MidiPlayerOptions {
  onNoteOn?: (note: string, velocity?: number, time?: number) => void;
  onNoteOff?: (note: string, time?: number) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnd?: () => void;
}

export class MidiPlayer {
  private midi: Midi | null = null;
  private isPlaying = false;
  private isPaused = false;
  private startTime = 0;
  private pauseTime = 0;
  private currentTime = 0;
  private duration = 0;
  private scheduledEvents: number[] = [];
  private progressInterval: number | null = null;
  private options: MidiPlayerOptions;
  private synth!: Tone.PolySynth;
  private activeNotes: Map<string, Tone.Unit.Frequency> = new Map();
  private currentInstrument: InstrumentConfig = INSTRUMENTS[0];

  constructor(options: MidiPlayerOptions = {}) {
    this.options = options;
    this.createSynth();
  }

  private createSynth(): void {
    // 如果已有合成器，先销毁
    if (this.synth) {
      this.synth.dispose();
    }
    
    // 创建多音合成器
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: this.currentInstrument.oscillator,
      envelope: this.currentInstrument.envelope
    }).toDestination();
    
    // 设置最大复音数
    this.synth.maxPolyphony = 32;
    
    // 设置音量
    this.synth.volume.value = -10; // 降低音量避免失真
  }

  async loadMidi(midi: Midi): Promise<void> {
    this.midi = midi;
    this.duration = midi.duration;
    this.currentTime = 0;
    
    // 确保Tone.js音频上下文已启动
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }
  }

  async play(): Promise<void> {
    if (!this.midi) {
      throw new Error('没有加载MIDI文件');
    }

    if (this.isPlaying) return;

    // 确保音频上下文处于运行状态
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    this.isPlaying = true;
    this.isPaused = false;

    if (this.pauseTime > 0) {
      // 从暂停位置继续播放
      this.startTime = Tone.now() - this.pauseTime;
    } else {
      // 从头开始播放
      this.startTime = Tone.now();
      this.currentTime = 0;
    }

    this.scheduleNotes();
    this.startProgressTracking();
  }

  pause(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.isPaused = true;
    this.pauseTime = Tone.now() - this.startTime;
    
    // 停止所有当前播放的音符
    this.synth.releaseAll();
    this.activeNotes.clear();
    
    this.clearScheduledEvents();
    this.stopProgressTracking();
  }

  stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentTime = 0;
    this.pauseTime = 0;
    
    // 停止所有音符
    this.synth.releaseAll();
    this.activeNotes.clear();
    
    this.clearScheduledEvents();
    this.stopProgressTracking();
    
    if (this.options.onProgress) {
      this.options.onProgress(0, this.duration);
    }
  }

  private scheduleNotes(): void {
    if (!this.midi) return;

    const startOffset = this.pauseTime || 0;

    this.midi.tracks.forEach(track => {
      track.notes.forEach(note => {
        const noteStartTime = note.time - startOffset;
        const noteEndTime = (note.time + note.duration) - startOffset;

        if (noteStartTime >= 0) {
          // 安排音符开始
          const noteOnId = Tone.Transport.schedule((time) => {
            if (this.isPlaying) {
              // 实际播放音符
              this.playNote(note.name, note.velocity, note.duration, time);
              
              // 通知UI更新
              if (this.options.onNoteOn) {
                this.options.onNoteOn(note.name, note.velocity, time);
              }
            }
          }, noteStartTime);
          this.scheduledEvents.push(noteOnId);

          // 安排音符结束回调（用于UI更新）
          if (this.options.onNoteOff) {
            const noteOffId = Tone.Transport.schedule((time) => {
              if (this.isPlaying) {
                this.options.onNoteOff!(note.name, time);
              }
            }, noteEndTime);
            this.scheduledEvents.push(noteOffId);
          }
        }
      });
    });

    // 启动Transport
    Tone.Transport.start();
  }

  private playNote(noteName: string, velocity: number, duration: number, time: number): void {
    try {
      // 播放音符，velocity已经内置在triggerAttackRelease中
      this.synth.triggerAttackRelease(noteName, duration, time, velocity * 0.5); // 降低音量避免失真
      
    } catch (error) {
      console.warn('播放音符失败:', noteName, error);
    }
  }

  private clearScheduledEvents(): void {
    this.scheduledEvents.forEach(id => {
      Tone.Transport.clear(id);
    });
    this.scheduledEvents = [];
    Tone.Transport.stop();
  }

  private startProgressTracking(): void {
    this.progressInterval = window.setInterval(() => {
      if (this.isPlaying) {
        this.currentTime = Tone.now() - this.startTime;
        
        if (this.options.onProgress) {
          this.options.onProgress(this.currentTime, this.duration);
        }

        // 检查是否播放完成
        if (this.currentTime >= this.duration) {
          this.stop();
          if (this.options.onEnd) {
            this.options.onEnd();
          }
        }
      }
    }, 100);
  }

  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  // 设置音量
  setVolume(volume: number): void {
    this.synth.volume.value = Tone.gainToDb(volume);
  }

  // 切换音色
  setInstrument(instrumentId: string): void {
    const instrument = INSTRUMENTS.find(inst => inst.id === instrumentId);
    if (!instrument) {
      console.warn('未找到音色:', instrumentId);
      return;
    }
    
    this.currentInstrument = instrument;
    
    // 重新创建合成器以应用新音色
    const currentVolume = this.synth.volume.value;
    this.createSynth();
    this.synth.volume.value = currentVolume;
  }

  // 获取当前音色
  getCurrentInstrument(): InstrumentConfig {
    return this.currentInstrument;
  }

  // 获取所有可用音色
  getAvailableInstruments(): InstrumentConfig[] {
    return INSTRUMENTS;
  }

  // Getters
  get playing(): boolean {
    return this.isPlaying;
  }

  get paused(): boolean {
    return this.isPaused;
  }

  get time(): number {
    return this.currentTime;
  }

  get totalDuration(): number {
    return this.duration;
  }

  dispose(): void {
    this.stop();
    this.synth.dispose();
    this.midi = null;
  }
}

// MIDI note number 转换为音符名称的辅助函数
export function midiNoteToName(noteNumber: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor((noteNumber / 12)) - 1;
  const noteIndex = noteNumber % 12;
  return `${noteNames[noteIndex]}${octave}`;
}