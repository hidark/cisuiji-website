import * as tf from '@tensorflow/tfjs';
import { BasicPitch } from '@spotify/basic-pitch';
import { AUDIO_CONFIG, BASIC_PITCH_CONFIG, PITCH_RANGES, NOTE_NAMES, MIDI_CONFIG } from '../config/constants';

// 定义NoteEventTime类型（从Basic Pitch类型定义中复制）
interface NoteEventTime {
  startTimeSeconds: number;
  durationSeconds: number;
  pitchMidi: number;
  amplitude: number;
  pitchBends?: number[];
}

export interface PitchNote {
  pitch: number;
  startTime: number;
  duration: number;
  amplitude: number;
  pitchBends?: number[];
}

export interface AnalysisConfig {
  onsetThreshold?: number;
  frameThreshold?: number;
  minNoteLength?: number;
  inferPitchBends?: boolean;
  melodiaTrick?: boolean;
  minPitch?: number;
  maxPitch?: number;
}

export class BasicPitchAnalyzer {
  private model: BasicPitch | null = null;
  private audioContext: AudioContext;
  private isModelLoaded = false;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }

  async initialize(): Promise<void> {
    if (this.isModelLoaded) return;
    
    try {
      // 设置TensorFlow.js后端
      await tf.ready();
      console.log('TensorFlow.js backend:', tf.getBackend());
      
      // 加载Basic Pitch模型
      this.model = new BasicPitch(BASIC_PITCH_CONFIG.MODEL_URL);
      this.isModelLoaded = true;
      console.log('Basic Pitch model loaded successfully');
    } catch (error) {
      console.error('Failed to load Basic Pitch model:', error);
      throw error;
    }
  }

  async analyzeAudioFile(
    file: File, 
    config: AnalysisConfig = {},
    onProgress?: (percent: number) => void
  ): Promise<{
    notes: PitchNote[];
    tracks: Map<string, PitchNote[]>;
  }> {
    if (!this.model) {
      await this.initialize();
    }

    // 读取音频文件
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    console.log(`原始音频: 时长=${audioBuffer.duration}秒, 采样率=${audioBuffer.sampleRate}Hz, 声道=${audioBuffer.numberOfChannels}`);
    
    // Basic Pitch需要22050Hz采样率，重采样音频
    const resampledBuffer = await this.resampleAudioBuffer(audioBuffer, AUDIO_CONFIG.SAMPLE_RATE);
    console.log(`重采样后: 时长=${resampledBuffer.duration}秒, 采样率=${resampledBuffer.sampleRate}Hz, 声道=${resampledBuffer.numberOfChannels}`);
    
    // 分析音频
    return this.analyzeAudioBuffer(resampledBuffer, config, onProgress);
  }

  async analyzeAudioBuffer(
    audioBuffer: AudioBuffer,
    config: AnalysisConfig = {},
    onProgress?: (percent: number) => void
  ): Promise<{
    notes: PitchNote[];
    tracks: Map<string, PitchNote[]>;
  }> {
    if (!this.model) {
      await this.initialize();
    }

    // 设置默认参数
    const {
      onsetThreshold = BASIC_PITCH_CONFIG.DEFAULT_ONSET_THRESHOLD,
      frameThreshold = BASIC_PITCH_CONFIG.DEFAULT_FRAME_THRESHOLD,
      minNoteLength = BASIC_PITCH_CONFIG.MIN_NOTE_LENGTH, // 最小音符长度（毫秒）
      // inferPitchBends = true,
      // melodiaTrick = true,
      // minPitch = 24, // MIDI C1
      // maxPitch = 96, // MIDI C7
    } = config;

    // 使用Basic Pitch进行分析
    return new Promise((resolve, reject) => {
      // 累积所有窗口的结果
      const allFrames: number[][] = [];
      const allOnsets: number[][] = [];
      const allContours: number[][] = [];
      
      // onComplete回调 - 会被多次调用（每个2秒窗口调用一次）
      const onCompleteCallback = (
        framesResult: number[][], 
        onsetsResult: number[][], 
        contoursResult: number[][]
      ) => {
        // 累积每个窗口的结果
        allFrames.push(...framesResult);
        allOnsets.push(...onsetsResult);
        allContours.push(...contoursResult);
        console.log(`累积帧数: frames=${allFrames.length}, onsets=${allOnsets.length}, contours=${allContours.length}`);
      };
      
      // 进度回调
      const percentCallback = (percent: number) => {
        console.log(`音频分析进度: ${(percent * 100).toFixed(2)}%`);
        if (onProgress) {
          onProgress(percent * 100);
        }
        
        // 当分析完成时（进度达到100%）
        if (percent >= 1.0) {
          console.log(`音频分析完成，总帧数: ${allFrames.length}`);
          
          // 从累积的frames创建音符事件
          const noteEvents = this.framesToNotes(
            allOnsets,
            allContours, 
            allFrames,
            audioBuffer.sampleRate,
            onsetThreshold,
            frameThreshold,
            minNoteLength / 1000,
            // melodiaTrick
          );
          
          console.log(`提取到 ${noteEvents.length} 个音符`);
          
          // 转换为我们的格式
          const notes = this.convertToNotes(noteEvents);
          
          // 智能分轨（基于音高范围和时间重叠）
          const tracks = this.separateIntoTracks(notes);
          
          console.log(`分析完成: ${notes.length} 个音符, ${tracks.size} 个音轨`);
          
          resolve({ notes, tracks });
        }
      };
      
      // 调用evaluateModel
      this.model!.evaluateModel(audioBuffer, onCompleteCallback, percentCallback)
        .catch(reject);
    });
  }

  private async resampleAudioBuffer(audioBuffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> {
    const needsResampling = audioBuffer.sampleRate !== targetSampleRate;
    const needsMonoConversion = audioBuffer.numberOfChannels > 1;
    
    // 如果不需要任何处理，直接返回
    if (!needsResampling && !needsMonoConversion) {
      return audioBuffer;
    }

    console.log(`处理音频: ${audioBuffer.sampleRate}Hz/${audioBuffer.numberOfChannels}ch -> ${targetSampleRate}Hz/1ch`);

    // 创建离线音频上下文进行重采样和单声道转换
    // 重要：输出必须是单声道（1声道）
    const offlineContext = new OfflineAudioContext(
      1, // 单声道输出
      Math.floor(audioBuffer.duration * targetSampleRate),
      targetSampleRate
    );

    // 创建源节点
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    // 连接到目标（offlineContext会自动处理声道混合）
    source.connect(offlineContext.destination);

    // 开始播放
    source.start(0);

    // 渲染处理后的音频
    const processedBuffer = await offlineContext.startRendering();
    
    console.log(`音频处理完成: ${processedBuffer.length} samples at ${processedBuffer.sampleRate}Hz, ${processedBuffer.numberOfChannels} channel(s)`);
    
    return processedBuffer;
  }

  private getMonoAudioData(audioBuffer: AudioBuffer): Float32Array {
    // 如果已经是单声道，直接返回
    if (audioBuffer.numberOfChannels === 1) {
      return audioBuffer.getChannelData(0);
    }

    // 混合多声道为单声道
    const length = audioBuffer.length;
    const monoData = new Float32Array(length);
    const numberOfChannels = audioBuffer.numberOfChannels;

    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (let channel = 0; channel < numberOfChannels; channel++) {
        sum += audioBuffer.getChannelData(channel)[i];
      }
      monoData[i] = sum / numberOfChannels;
    }

    return monoData;
  }

  private convertToNotes(noteEvents: NoteEventTime[]): PitchNote[] {
    return noteEvents.map(event => ({
      pitch: event.pitchMidi,
      startTime: event.startTimeSeconds,
      duration: event.durationSeconds,
      amplitude: event.amplitude || 0.8,
      pitchBends: event.pitchBends
    }));
  }

  private separateIntoTracks(notes: PitchNote[]): Map<string, PitchNote[]> {
    const tracks = new Map<string, PitchNote[]>();
    
    // 按音高范围分组（简单的乐器分离策略）
    const bassNotes: PitchNote[] = [];
    const melodyNotes: PitchNote[] = [];
    const harmonyNotes: PitchNote[] = [];

    notes.forEach(note => {
      if (note.pitch <= PITCH_RANGES.BASS.MAX) { // 贝斯音域
        bassNotes.push(note);
      } else if (note.pitch >= PITCH_RANGES.MELODY.MIN) { // 主旋律音域
        melodyNotes.push(note);
      } else { // 中间音域 - 和声
        harmonyNotes.push(note);
      }
    });

    // 进一步分析和声部分，分离和弦
    const chordNotes: PitchNote[] = [];
    const accompanimentNotes: PitchNote[] = [];
    
    harmonyNotes.forEach(note => {
      // 检查同时发声的音符数量
      const simultaneousNotes = harmonyNotes.filter(
        other => Math.abs(other.startTime - note.startTime) < 0.05
      );
      
      if (simultaneousNotes.length >= 3) {
        chordNotes.push(note);
      } else {
        accompanimentNotes.push(note);
      }
    });

    // 添加非空轨道
    if (bassNotes.length > 0) tracks.set('Bass', bassNotes);
    if (melodyNotes.length > 0) tracks.set('Melody', melodyNotes);
    if (chordNotes.length > 0) tracks.set('Chords', chordNotes);
    if (accompanimentNotes.length > 0) tracks.set('Accompaniment', accompanimentNotes);

    return tracks;
  }

  // 将MIDI音高转换为音符名称
  midiToNoteName(midiPitch: number): string {
    const octave = Math.floor(midiPitch / 12) - 1;
    const noteIndex = midiPitch % 12;
    return `${NOTE_NAMES[noteIndex]}${octave}`;
  }

  // 量化音符到最近的节拍
  quantizeNotes(notes: PitchNote[], bpm: number = MIDI_CONFIG.DEFAULT_BPM, subdivision: number = MIDI_CONFIG.QUANTIZE_SUBDIVISION): PitchNote[] {
    const beatDuration = 60 / bpm; // 一拍的秒数
    const quantumDuration = beatDuration / (subdivision / 4); // 量化单位的秒数

    return notes.map(note => ({
      ...note,
      startTime: Math.round(note.startTime / quantumDuration) * quantumDuration,
      duration: Math.round(note.duration / quantumDuration) * quantumDuration
    }));
  }

  // 检测和弦
  detectChords(notes: PitchNote[], timeWindow: number = 0.1): Array<{
    time: number;
    pitches: number[];
    chordName: string;
  }> {
    const chords: Array<{ time: number; pitches: number[]; chordName: string }> = [];
    const processedTimes = new Set<number>();

    notes.forEach(note => {
      if (processedTimes.has(note.startTime)) return;

      // 找出在时间窗口内的所有音符
      const simultaneousNotes = notes.filter(
        other => Math.abs(other.startTime - note.startTime) <= timeWindow
      );

      if (simultaneousNotes.length >= 2) {
        const pitches = simultaneousNotes.map(n => n.pitch);
        const chordName = this.identifyChord(pitches);
        
        chords.push({
          time: note.startTime,
          pitches,
          chordName
        });

        simultaneousNotes.forEach(n => processedTimes.add(n.startTime));
      }
    });

    return chords;
  }

  private identifyChord(pitches: number[]): string {
    // 简化的和弦识别逻辑
    const pitchClasses = pitches.map(p => p % 12).sort((a, b) => a - b);
    const uniquePitchClasses = [...new Set(pitchClasses)];

    // 检查常见和弦类型
    const intervals = [];
    for (let i = 1; i < uniquePitchClasses.length; i++) {
      intervals.push(uniquePitchClasses[i] - uniquePitchClasses[0]);
    }

    const intervalsStr = intervals.join(',');
    const rootNote = this.midiToNoteName(pitches[0]).replace(/\d+/, '');

    // 匹配和弦类型
    switch (intervalsStr) {
      case '4,7': return `${rootNote} Major`;
      case '3,7': return `${rootNote} Minor`;
      case '4,7,11': return `${rootNote} Major 7`;
      case '3,7,10': return `${rootNote} Minor 7`;
      case '4,7,10': return `${rootNote} Dominant 7`;
      case '3,6': return `${rootNote} Diminished`;
      case '4,8': return `${rootNote} Augmented`;
      default: return `${rootNote} Chord`;
    }
  }

  // 导出为MIDI格式数据
  exportToMidiData(notes: PitchNote[]): unknown {
    const midiTracks = notes.map(note => ({
      pitch: note.pitch,
      startTime: note.startTime,
      endTime: note.startTime + note.duration,
      velocity: Math.round(note.amplitude * 127)
    }));

    return {
      ticksPerQuarter: 480,
      tracks: [midiTracks]
    };
  }

  // 从帧数据创建音符事件的辅助方法
  private framesToNotes(
    onsets: number[][],
    contours: number[][],
    frames: number[][],
    sampleRate: number,
    onsetThreshold: number,
    frameThreshold: number,
    minNoteLength: number,
    // melodiaTrick: boolean
  ): NoteEventTime[] {
    const notes: NoteEventTime[] = [];
    const hopSize = 256; // Basic Pitch使用256作为FFT_HOP
    const frameToTime = (frame: number) => (frame * hopSize) / sampleRate;
    
    // 跟踪每个音高的活跃状态
    const activeNotes = new Map<number, number>(); // pitch -> startFrame
    
    // 遍历所有帧
    for (let frame = 0; frame < frames.length; frame++) {
      if (!frames[frame]) continue; // 跳过空帧
      
      for (let pitch = 0; pitch < frames[frame].length; pitch++) {
        const isActive = frames[frame][pitch] > frameThreshold;
        const wasActive = activeNotes.has(pitch);
        const isOnset = onsets[frame] && onsets[frame][pitch] > onsetThreshold;
        
        if (isActive && (!wasActive || isOnset)) {
          // 新音符开始
          activeNotes.set(pitch, frame);
        } else if (!isActive && wasActive) {
          // 音符结束
          const startFrame = activeNotes.get(pitch)!;
          const startTime = frameToTime(startFrame);
          const endTime = frameToTime(frame);
          const duration = endTime - startTime;
          
          // 检查最小音符长度
          if (duration >= minNoteLength) {
            const amplitude = frames[startFrame][pitch];
            notes.push({
              startTimeSeconds: startTime,
              durationSeconds: duration,
              pitchMidi: pitch + 24, // Basic Pitch从MIDI 24开始
              amplitude: amplitude > 0 ? amplitude : 0.8,
              pitchBends: []
            });
          }
          
          activeNotes.delete(pitch);
        }
      }
    }
    
    // 处理仍然活跃的音符（在音频末尾）
    for (const [pitch, startFrame] of activeNotes.entries()) {
      const startTime = frameToTime(startFrame);
      const endTime = frameToTime(frames.length);
      const duration = endTime - startTime;
      
      if (duration >= minNoteLength) {
        const amplitude = frames[startFrame][pitch];
        notes.push({
          startTimeSeconds: startTime,
          durationSeconds: duration,
          pitchMidi: pitch + 24,
          amplitude: amplitude > 0 ? amplitude : 0.8,
          pitchBends: []
        });
      }
    }
    
    // 按开始时间排序
    notes.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
    
    console.log(`framesToNotes: 处理了 ${frames.length} 帧，提取了 ${notes.length} 个音符`);
    
    return notes;
  }

  dispose(): void {
    // Dispose TensorFlow model and clear memory
    if (this.model) {
      this.model = null;
      this.isModelLoaded = false;
    }
    
    // Close audio context if it's not already closed
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(err => {
        console.error('Error closing audio context:', err);
      });
    }
    
    // Clear any tensors from memory
    tf.disposeVariables();
    
    console.log('BasicPitchAnalyzer disposed');
  }
}