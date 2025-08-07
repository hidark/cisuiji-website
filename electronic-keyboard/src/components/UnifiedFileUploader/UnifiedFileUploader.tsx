import { useState, useRef, useEffect } from 'react';
import { Midi } from '@tonejs/midi';
import { BasicPitchAnalyzer } from '../../services/basicPitchAnalyzer';
import type { PitchNote } from '../../services/basicPitchAnalyzer';
import { 
  UploadIcon, 
  LoadingIcon, 
  MusicIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  PlayIcon,
  PauseIcon 
} from '../Icons';
import { PlaybackControls } from '../MidiControls/PlaybackControls';
import { VolumeControl } from '../MidiControls/VolumeControl';
import { ProgressBar } from '../MidiControls/ProgressBar';
import { errorHandler, ErrorType } from '../../services/errorHandler';
import { AUDIO_CONFIG, BASIC_PITCH_CONFIG, WAVEFORM_CONFIG } from '../../config/constants';
import WaveSurfer from 'wavesurfer.js';
import styles from './UnifiedFileUploader.module.css';

interface UnifiedFileUploaderProps {
  onMidiLoad?: (midi: Midi) => void;
  onAudioNotesExtracted?: (notes: Array<{note: string, time: number, duration: number}>) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onVolumeChange?: (volume: number) => void;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
}

type FileType = 'midi' | 'audio' | 'unknown';

interface AnalysisResult {
  notes: PitchNote[];
  tracks: Map<string, PitchNote[]>;
  tempo?: number;
  duration?: number;
}

export function UnifiedFileUploader({
  onMidiLoad,
  onAudioNotesExtracted,
  onPlay,
  onPause,
  onStop,
  onVolumeChange,
  isPlaying,
  isPaused,
  currentTime,
  duration
}: UnifiedFileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [volume, setVolume] = useState(0.5);
  
  // MIDI相关状态
  const [midiData, setMidiData] = useState<Midi | null>(null);
  
  // 音频分析相关状态
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const analyzerRef = useRef<BasicPitchAnalyzer | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  
  // 自动最小化
  useEffect(() => {
    if (isPlaying && !isPaused) {
      setIsMinimized(true);
    }
  }, [isPlaying, isPaused]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
      
      if (analyzerRef.current) {
        analyzerRef.current.dispose();
        analyzerRef.current = null;
      }
      
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);
  
  const detectFileType = (file: File): FileType => {
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    if (fileName.endsWith('.mid') || fileName.endsWith('.midi') || mimeType.includes('midi')) {
      return 'midi';
    }
    
    if (fileName.endsWith('.mp3') || fileName.endsWith('.wav') || fileName.endsWith('.wave') || 
        mimeType.includes('audio')) {
      return 'audio';
    }
    
    return 'unknown';
  };
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const detectedType = detectFileType(file);
    
    if (detectedType === 'unknown') {
      setError('不支持的文件格式。请选择 MIDI (*.mid, *.midi) 或音频文件 (*.mp3, *.wav)');
      return;
    }
    
    setSelectedFile(file);
    setFileType(detectedType);
    setError(null);
    
    if (detectedType === 'midi') {
      await handleMidiFile(file);
    } else if (detectedType === 'audio') {
      await handleAudioFile(file);
    }
  };
  
  const handleMidiFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    // Clear audio analysis when loading MIDI
    setAnalysisResult(null);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const midi = new Midi(arrayBuffer);
      setMidiData(midi);
      
      if (onMidiLoad) {
        onMidiLoad(midi);
      }
    } catch (err) {
      console.error('MIDI解析错误:', err);
      errorHandler.handleError(err as Error, ErrorType.MIDI_LOAD_ERROR);
      setError('MIDI文件解析失败！请确保文件格式正确。');
      setMidiData(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAudioFile = async (file: File) => {
    setIsAnalyzing(true);
    setProgress(0);
    // Clear MIDI data when loading audio
    setMidiData(null);
    
    try {
      // 初始化Basic Pitch分析器
      if (!analyzerRef.current) {
        analyzerRef.current = new BasicPitchAnalyzer();
        setIsModelLoading(true);
        setProgress(10);
        await analyzerRef.current.initialize();
        setIsModelLoading(false);
      }
      
      // 加载和显示波形
      if (waveformRef.current) {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
          wavesurferRef.current = null;
        }
        
        wavesurferRef.current = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: WAVEFORM_CONFIG.WAVE_COLOR,
          progressColor: WAVEFORM_CONFIG.PROGRESS_COLOR,
          cursorColor: WAVEFORM_CONFIG.CURSOR_COLOR,
          height: WAVEFORM_CONFIG.HEIGHT,
          normalize: WAVEFORM_CONFIG.NORMALIZE,
          backend: WAVEFORM_CONFIG.BACKEND
        });
      }
      
      // 清理旧的URL
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      
      // 加载音频文件到波形显示
      const url = URL.createObjectURL(file);
      audioUrlRef.current = url;
      
      if (wavesurferRef.current) {
        await wavesurferRef.current.load(url);
      }
      
      // 使用Basic Pitch分析音频
      setProgress(30);
      const result = await analyzerRef.current.analyzeAudioFile(file, {
        onsetThreshold: BASIC_PITCH_CONFIG.DEFAULT_ONSET_THRESHOLD,
        frameThreshold: BASIC_PITCH_CONFIG.DEFAULT_FRAME_THRESHOLD,
        minNoteLength: BASIC_PITCH_CONFIG.MIN_NOTE_LENGTH,
        inferPitchBends: BASIC_PITCH_CONFIG.INFER_PITCH_BENDS
      }, (percent: number) => {
        const adjustedProgress = 30 + (percent * 0.6);
        setProgress(Math.round(adjustedProgress));
      });
      
      setProgress(90);
      
      // 计算节奏
      const tempo = estimateTempo(result.notes);
      const calculatedDuration = result.notes.length > 0 
        ? Math.max(...result.notes.map(n => n.startTime + n.duration))
        : 0;
      
      const analysisData: AnalysisResult = {
        notes: result.notes,
        tracks: result.tracks,
        tempo,
        duration: calculatedDuration
      };
      
      setAnalysisResult(analysisData);
      
      // 转换为可播放序列
      const playableNotes = convertToPlayableSequence(result.notes);
      if (onAudioNotesExtracted) {
        onAudioNotesExtracted(playableNotes);
      }
      
      setProgress(100);
      
    } catch (err) {
      console.error('音频分析错误:', err);
      errorHandler.handleError(err as Error, ErrorType.ANALYSIS_ERROR);
      setError('音频分析失败，请尝试其他文件');
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 500);
    }
  };
  
  const estimateTempo = (notes: PitchNote[]): number => {
    if (notes.length < 2) return 120;
    
    const intervals: number[] = [];
    for (let i = 1; i < notes.length; i++) {
      const interval = notes[i].startTime - notes[i - 1].startTime;
      if (interval > 0.1 && interval < 2) {
        intervals.push(interval);
      }
    }
    
    if (intervals.length === 0) return 120;
    
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];
    const bpm = 60 / medianInterval;
    
    const standardBPMs = [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180];
    return standardBPMs.reduce((prev, curr) => 
      Math.abs(curr - bpm) < Math.abs(prev - bpm) ? curr : prev
    );
  };
  
  const convertToPlayableSequence = (notes: PitchNote[]) => {
    if (!analyzerRef.current) return [];
    
    return notes.map(note => ({
      note: analyzerRef.current!.midiToNoteName(note.pitch),
      time: note.startTime,
      duration: note.duration
    }));
  };
  
  const handleTrackSelect = (trackName: string) => {
    setSelectedTrack(trackName);
    
    if (!analysisResult || !onAudioNotesExtracted) return;
    
    let notesToPlay: PitchNote[] = [];
    
    if (trackName === 'all') {
      notesToPlay = analysisResult.notes;
    } else {
      notesToPlay = analysisResult.tracks.get(trackName) || [];
    }
    
    const playableNotes = convertToPlayableSequence(notesToPlay);
    onAudioNotesExtracted(playableNotes);
  };
  
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (onVolumeChange) {
      onVolumeChange(newVolume);
    }
  };
  
  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className={`${styles.unifiedUploader} ${isMinimized ? styles.minimized : ''}`}>
      {/* 头部 */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <MusicIcon size={16} />
          <span className={styles.title}>音乐文件播放器</span>
          {selectedFile && (
            <span className={styles.fileName} title={selectedFile.name}>
              {selectedFile.name}
            </span>
          )}
          {fileType !== 'unknown' && (
            <span className={styles.fileType}>
              [{fileType === 'midi' ? 'MIDI' : 'Audio'}]
            </span>
          )}
          {(isPlaying || isPaused) && (
            <div className={`${styles.statusIndicator} ${isPlaying ? styles.playing : styles.paused}`}>
              {isPlaying ? <MusicIcon size={16} /> : <PauseIcon size={16} />}
            </div>
          )}
        </div>
        <button 
          onClick={toggleMinimized}
          className={styles.toggleButton}
          aria-label={isMinimized ? "展开播放器" : "收起播放器"}
        >
          {isMinimized ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
        </button>
      </div>
      
      {/* 主内容区域 */}
      {!isMinimized && (
        <div className={styles.content}>
          {/* 文件上传区域 */}
          <div className={styles.uploadSection}>
            <input
              type="file"
              accept=".mid,.midi,audio/*,.mp3,.wav,.wave"
              onChange={handleFileSelect}
              ref={fileInputRef}
              style={{ display: 'none' }}
              disabled={isLoading || isAnalyzing || isModelLoading}
            />
            
            <button 
              onClick={handleUploadClick}
              className={styles.uploadButton}
              disabled={isLoading || isAnalyzing || isModelLoading}
            >
              {isModelLoading ? (
                <>
                  <LoadingIcon size={20} />
                  <span>加载AI模型...</span>
                </>
              ) : (isLoading || isAnalyzing) ? (
                <>
                  <LoadingIcon size={20} />
                  <span>{isAnalyzing ? '分析中...' : '加载中...'}</span>
                </>
              ) : (
                <>
                  <UploadIcon size={20} />
                  <span>{selectedFile ? '更换文件' : '选择文件'}</span>
                </>
              )}
            </button>
            
            <p className={styles.supportedFormats}>
              支持格式：MIDI (*.mid, *.midi) | 音频 (*.mp3, *.wav)
            </p>
          </div>
          
          {/* 进度条 (音频分析时) */}
          {isAnalyzing && progress > 0 && (
            <div className={styles.progressSection}>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className={styles.progressText}>
                正在分析音频... {progress}%
              </span>
            </div>
          )}
          
          {/* 错误消息 */}
          {error && (
            <div className={styles.errorMessage} role="alert">
              <span>{error}</span>
            </div>
          )}
          
          {/* 波形显示 (音频文件) */}
          {fileType === 'audio' && selectedFile && !error && (
            <div className={styles.waveformSection}>
              <div ref={waveformRef} className={styles.waveform} />
            </div>
          )}
          
          {/* MIDI文件信息 */}
          {fileType === 'midi' && midiData && (
            <div className={styles.fileInfo}>
              <div className={styles.infoItem}>
                <span className={styles.label}>时长：</span>
                <span className={styles.value}>{formatTime(midiData.duration)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>音轨：</span>
                <span className={styles.value}>{midiData.tracks.length}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>节拍：</span>
                <span className={styles.value}>{midiData.header.tempos[0]?.bpm || 120} BPM</span>
              </div>
            </div>
          )}
          
          {/* 音频分析结果 */}
          {fileType === 'audio' && analysisResult && (
            <div className={styles.analysisResult}>
              <h3>分析结果 (Basic Pitch AI)</h3>
              <div className={styles.fileInfo}>
                <div className={styles.infoItem}>
                  <span className={styles.label}>检测音符：</span>
                  <span className={styles.value}>{analysisResult.notes.length} 个</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>估算节奏：</span>
                  <span className={styles.value}>{analysisResult.tempo} BPM</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>时长：</span>
                  <span className={styles.value}>{formatTime(analysisResult.duration || 0)}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>识别音轨：</span>
                  <span className={styles.value}>{analysisResult.tracks.size} 个</span>
                </div>
              </div>
              
              {/* 音轨选择 */}
              {analysisResult.tracks.size > 0 && (
                <div className={styles.trackSelector}>
                  <h4>选择音轨</h4>
                  <div className={styles.trackButtons}>
                    <button
                      className={`${styles.trackButton} ${selectedTrack === 'all' ? styles.active : ''}`}
                      onClick={() => handleTrackSelect('all')}
                    >
                      全部 ({analysisResult.notes.length})
                    </button>
                    {Array.from(analysisResult.tracks.entries()).map(([trackName, notes]) => (
                      <button
                        key={trackName}
                        className={`${styles.trackButton} ${selectedTrack === trackName ? styles.active : ''}`}
                        onClick={() => handleTrackSelect(trackName)}
                      >
                        {trackName} ({notes.length})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 播放控制 */}
          {(midiData || analysisResult) && (
            <div className={styles.playbackControls}>
              <PlaybackControls
                onPlay={onPlay}
                onPause={onPause}
                onStop={onStop}
                isPlaying={isPlaying}
                isPaused={isPaused}
              />
              
              <VolumeControl
                volume={volume}
                onVolumeChange={handleVolumeChange}
              />
              
              <ProgressBar
                currentTime={currentTime}
                duration={duration}
              />
            </div>
          )}
          
          {/* 使用提示 */}
          {!selectedFile && !error && (
            <div className={styles.helpText}>
              <h3>🎵 统一音乐文件播放器</h3>
              <div className={styles.helpSection}>
                <h4>📁 MIDI文件</h4>
                <p>直接播放MIDI文件，支持多音轨、节奏控制</p>
              </div>
              <div className={styles.helpSection}>
                <h4>🎼 音频文件 (MP3/WAV)</h4>
                <p>使用AI分析音频并提取音符，支持：</p>
                <ul>
                  <li>复音检测（和弦、多乐器）</li>
                  <li>智能音轨分离</li>
                  <li>识别演奏技巧</li>
                  <li>自动节奏检测</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}