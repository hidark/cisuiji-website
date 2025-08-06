import { useState, useRef, useEffect } from 'react';
import { BasicPitchAnalyzer } from '../../services/basicPitchAnalyzer';
import type { PitchNote } from '../../services/basicPitchAnalyzer';
import { UploadIcon, PlayIcon, LoadingIcon, MusicIcon, ChevronDownIcon, ChevronUpIcon } from '../Icons';
import WaveSurfer from 'wavesurfer.js';
import styles from './AudioAnalyzer.module.css';

interface AudioAnalyzerProps {
  onNotesExtracted: (notes: Array<{note: string, time: number, duration: number}>) => void;
  onPlay: () => void;
  onStop: () => void;
  isPlaying: boolean;
}

interface AnalysisResult {
  notes: PitchNote[];
  tracks: Map<string, PitchNote[]>;
  tempo?: number;
  duration?: number;
}

export function AudioAnalyzer({ onNotesExtracted, onPlay, onStop, isPlaying }: AudioAnalyzerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [isModelLoading, setIsModelLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const analyzerRef = useRef<BasicPitchAnalyzer | null>(null);
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 验证文件类型
    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/x-wave'];
    const validExtensions = /\.(mp3|wav|wave)$/i;
    
    // Check if file has a valid type or extension
    const hasValidType = file.type && validTypes.includes(file.type.toLowerCase());
    const hasValidExtension = file.name.match(validExtensions);
    
    if (!hasValidType && !hasValidExtension) {
      setError('请选择 MP3 或 WAV 格式的音频文件');
      console.error('Invalid file type:', file.type, 'Name:', file.name);
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    setIsAnalyzing(true);
    setProgress(0);
    
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
      if (waveformRef.current && !wavesurferRef.current) {
        wavesurferRef.current = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: '#667eea',
          progressColor: '#9333ea',
          cursorColor: '#ec4899',
          height: 80,
          normalize: true,
          backend: 'WebAudio'
        });
      }
      
      // 加载音频文件到波形显示
      const url = URL.createObjectURL(file);
      if (wavesurferRef.current) {
        await wavesurferRef.current.load(url);
      }
      
      // 使用Basic Pitch分析音频
      setProgress(30);
      const result = await analyzerRef.current.analyzeAudioFile(file, {
        onsetThreshold: 0.5,
        frameThreshold: 0.3,
        minNoteLength: 50,
        inferPitchBends: true
      }, (percent: number) => {
        // 进度从30%到90%
        const adjustedProgress = 30 + (percent * 0.6);
        setProgress(Math.round(adjustedProgress));
      });
      
      setProgress(90);
      
      // 计算节奏（简单估算）
      const tempo = estimateTempo(result.notes);
      const duration = result.notes.length > 0 
        ? Math.max(...result.notes.map(n => n.startTime + n.duration))
        : 0;
      
      const analysisData: AnalysisResult = {
        notes: result.notes,
        tracks: result.tracks,
        tempo,
        duration
      };
      
      setAnalysisResult(analysisData);
      
      // 转换为可播放序列
      const playableNotes = convertToPlayableSequence(result.notes);
      onNotesExtracted(playableNotes);
      
      setProgress(100);
      
      // 清理URL
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('音频分析错误:', err);
      setError('音频分析失败，请尝试其他文件');
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 500);
    }
  };
  
  const handleUploadClick = () => {
    console.log('Upload button clicked, opening file dialog for audio files');
    fileInputRef.current?.click();
  };
  
  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };
  
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    
    if (!analysisResult) return;
    
    let notesToPlay: PitchNote[] = [];
    
    if (trackName === 'all') {
      notesToPlay = analysisResult.notes;
    } else {
      notesToPlay = analysisResult.tracks.get(trackName) || [];
    }
    
    const playableNotes = convertToPlayableSequence(notesToPlay);
    onNotesExtracted(playableNotes);
  };
  
  return (
    <div className={`${styles.audioAnalyzer} ${isMinimized ? styles.minimized : ''}`}>
      {/* 头部 */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <MusicIcon size={16} />
          <span className={styles.title}>音频转谱</span>
          {selectedFile && (
            <span className={styles.fileName} title={selectedFile.name}>
              {selectedFile.name}
            </span>
          )}
        </div>
        <button 
          onClick={toggleMinimized}
          className={styles.toggleButton}
          aria-label={isMinimized ? "展开" : "收起"}
        >
          {isMinimized ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
        </button>
      </div>
      
      {/* 主内容区域 */}
      {!isMinimized && (
        <div className={styles.content}>
          {/* 文件上传 */}
          <div className={styles.uploadSection}>
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.wave"
              onChange={handleFileSelect}
              ref={fileInputRef}
              style={{ display: 'none' }}
              aria-label="选择音频文件"
              id="audio-file-input"
            />
            
            <button 
              onClick={handleUploadClick}
              className={styles.uploadButton}
              disabled={isAnalyzing || isModelLoading}
              aria-busy={isAnalyzing || isModelLoading}
            >
              {isModelLoading ? (
                <>
                  <LoadingIcon size={20} />
                  <span>加载AI模型...</span>
                </>
              ) : isAnalyzing ? (
                <>
                  <LoadingIcon size={20} />
                  <span>分析中...</span>
                </>
              ) : (
                <>
                  <UploadIcon size={20} />
                  <span>{selectedFile ? '更换' : '选择'}音频文件</span>
                </>
              )}
            </button>
            
            <p className={styles.supportedFormats}>
              支持格式：MP3, WAV
            </p>
          </div>
          
          {/* 进度条 */}
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
          
          {/* 波形显示 */}
          {selectedFile && !error && (
            <div className={styles.waveformSection}>
              <div ref={waveformRef} className={styles.waveform} />
            </div>
          )}
          
          {/* 分析结果 */}
          {analysisResult && (
            <div className={styles.analysisResult}>
              <h3>分析结果 (Basic Pitch AI)</h3>
              <div className={styles.resultInfo}>
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
                  <span className={styles.value}>{formatDuration(analysisResult.duration || 0)}</span>
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
              
              {/* 播放按钮 */}
              <div className={styles.playControls}>
                <button
                  onClick={isPlaying ? onStop : onPlay}
                  className={`${styles.playButton} ${isPlaying ? styles.playing : ''}`}
                  aria-label={isPlaying ? "停止" : "播放"}
                >
                  <PlayIcon size={20} />
                  <span>{isPlaying ? '停止播放' : '播放乐谱'}</span>
                </button>
              </div>
              
              {/* 音符预览 */}
              <div className={styles.notesPreview}>
                <h4>音符序列预览 {selectedTrack !== 'all' && `(${selectedTrack})`}</h4>
                <div className={styles.notesList}>
                  {(() => {
                    const notesToShow = selectedTrack === 'all' 
                      ? analysisResult.notes 
                      : (analysisResult.tracks.get(selectedTrack) || []);
                    
                    return notesToShow.slice(0, 30).map((note, index) => (
                      <span key={index} className={styles.noteItem} title={`音高: ${note.pitch}, 时间: ${note.startTime.toFixed(2)}s`}>
                        {analyzerRef.current?.midiToNoteName(note.pitch)}
                      </span>
                    ));
                  })()}
                  {(() => {
                    const notesToShow = selectedTrack === 'all' 
                      ? analysisResult.notes 
                      : (analysisResult.tracks.get(selectedTrack) || []);
                    
                    return notesToShow.length > 30 && (
                      <span className={styles.moreNotes}>
                        ... 还有 {notesToShow.length - 30} 个音符
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
          
          {/* 使用提示 */}
          {!selectedFile && !error && (
            <div className={styles.helpText}>
              <h3>🎵 AI音频转谱功能 (Powered by Spotify Basic Pitch)</h3>
              <p>上传 MP3 或 WAV 音频文件，使用先进的AI模型分析并提取音乐中的音符。</p>
              <ul>
                <li>✨ 支持复音检测（和弦、多乐器）</li>
                <li>🎹 智能音轨分离（贝斯、旋律、和声）</li>
                <li>🎼 识别弯音、滑音等演奏技巧</li>
                <li>📊 自动节奏检测和量化</li>
                <li>🎯 高精度音高识别</li>
              </ul>
              <p style={{fontSize: '0.9em', opacity: 0.8, marginTop: '10px'}}>
                首次使用需要加载AI模型（约20MB），请耐心等待
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}