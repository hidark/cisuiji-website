import { PitchDetector } from 'pitchy';

export interface DetectedNote {
  note: string;
  frequency: number;
  time: number;
  duration: number;
  confidence: number;
  midiNumber: number;
}

export interface AnalysisResult {
  notes: DetectedNote[];
  tempo: number;
  duration: number;
  sampleRate: number;
}

export class AudioAnalyzer {
  private audioContext: AudioContext;
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  
  /**
   * 加载音频文件并转换为 AudioBuffer
   */
  async loadAudioFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }
  
  /**
   * 从音频缓冲区提取音符
   */
  async analyzeAudio(audioBuffer: AudioBuffer): Promise<AnalysisResult> {
    const channelData = audioBuffer.getChannelData(0); // 使用单声道
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    
    // 分析参数
    const windowSize = 4096; // FFT窗口大小
    const hopSize = windowSize / 4; // 窗口跳跃大小
    const minFrequency = 80; // C2 的频率 (最低音)
    const maxFrequency = 2000; // C7 的频率 (最高音)
    
    const detectedNotes: DetectedNote[] = [];
    const pitchDetector = PitchDetector.forFloat32Array(windowSize);
    
    // 滑动窗口分析
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      const [frequency, clarity] = pitchDetector.findPitch(window, sampleRate);
      
      if (frequency && clarity > 0.8 && frequency >= minFrequency && frequency <= maxFrequency) {
        const time = i / sampleRate;
        const note = this.frequencyToNote(frequency);
        const midiNumber = this.frequencyToMidiNumber(frequency);
        
        // 合并相邻的相同音符
        const lastNote = detectedNotes[detectedNotes.length - 1];
        if (lastNote && lastNote.note === note && time - (lastNote.time + lastNote.duration) < 0.05) {
          lastNote.duration = time - lastNote.time;
          lastNote.confidence = Math.max(lastNote.confidence, clarity);
        } else {
          detectedNotes.push({
            note,
            frequency,
            time,
            duration: hopSize / sampleRate,
            confidence: clarity,
            midiNumber
          });
        }
      }
    }
    
    // 过滤短音符和计算节奏
    const filteredNotes = this.filterAndProcessNotes(detectedNotes);
    const tempo = this.estimateTempo(filteredNotes);
    
    return {
      notes: filteredNotes,
      tempo,
      duration,
      sampleRate
    };
  }
  
  /**
   * 频率转换为音符名称
   */
  private frequencyToNote(frequency: number): string {
    const A4 = 440;
    const semitones = Math.round(12 * Math.log2(frequency / A4));
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    const octave = Math.floor((semitones + 57) / 12);
    const noteIndex = ((semitones + 57) % 12 + 12) % 12;
    
    return `${noteNames[noteIndex]}${octave}`;
  }
  
  /**
   * 频率转换为MIDI音符号
   */
  private frequencyToMidiNumber(frequency: number): number {
    const A4 = 440;
    return Math.round(69 + 12 * Math.log2(frequency / A4));
  }
  
  /**
   * 过滤和处理检测到的音符
   */
  private filterAndProcessNotes(notes: DetectedNote[]): DetectedNote[] {
    // 过滤太短的音符（小于50ms）
    const filtered = notes.filter(note => note.duration >= 0.05);
    
    // 合并非常接近的音符
    const merged: DetectedNote[] = [];
    for (const note of filtered) {
      const lastNote = merged[merged.length - 1];
      if (lastNote && 
          Math.abs(lastNote.time + lastNote.duration - note.time) < 0.02 &&
          Math.abs(lastNote.midiNumber - note.midiNumber) <= 1) {
        // 合并到前一个音符
        lastNote.duration = note.time + note.duration - lastNote.time;
        lastNote.frequency = (lastNote.frequency + note.frequency) / 2;
        lastNote.confidence = Math.max(lastNote.confidence, note.confidence);
      } else {
        merged.push(note);
      }
    }
    
    // 量化时间到最近的16分音符
    const quantized = merged.map(note => ({
      ...note,
      time: Math.round(note.time * 16) / 16,
      duration: Math.round(note.duration * 16) / 16
    }));
    
    return quantized;
  }
  
  /**
   * 估算节奏（BPM）
   */
  private estimateTempo(notes: DetectedNote[]): number {
    if (notes.length < 2) return 120; // 默认BPM
    
    // 计算音符间隔
    const intervals: number[] = [];
    for (let i = 1; i < notes.length; i++) {
      const interval = notes[i].time - notes[i - 1].time;
      if (interval > 0.1 && interval < 2) { // 合理的间隔范围
        intervals.push(interval);
      }
    }
    
    if (intervals.length === 0) return 120;
    
    // 找到最常见的间隔（可能是节拍）
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];
    
    // 转换为BPM（假设是四分音符）
    const bpm = 60 / medianInterval;
    
    // 标准化到常见的BPM范围
    const standardBPMs = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180];
    const closestBPM = standardBPMs.reduce((prev, curr) => 
      Math.abs(curr - bpm) < Math.abs(prev - bpm) ? curr : prev
    );
    
    return closestBPM;
  }
  
  /**
   * 将分析结果转换为可播放的序列
   */
  convertToPlayableSequence(result: AnalysisResult): Array<{note: string, time: number, duration: number}> {
    return result.notes.map(detectedNote => ({
      note: detectedNote.note,
      time: detectedNote.time,
      duration: detectedNote.duration
    }));
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}