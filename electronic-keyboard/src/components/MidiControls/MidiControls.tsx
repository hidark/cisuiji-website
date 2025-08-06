import { useState, useRef, useEffect } from 'react';
import { Midi } from '@tonejs/midi';
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  VolumeIcon, 
  UploadIcon, 
  ChevronUpIcon, 
  ChevronDownIcon,
  LoadingIcon,
  MusicIcon 
} from '../Icons';
import styles from './MidiControls.module.css';

interface MidiControlsProps {
  onMidiLoad: (midi: Midi) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onVolumeChange?: (volume: number) => void;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
}

export function MidiControls({
  onMidiLoad,
  onPlay,
  onPause,
  onStop,
  onVolumeChange,
  isPlaying,
  isPaused,
  currentTime,
  duration
}: MidiControlsProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [midiData, setMidiData] = useState<Midi | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMinimized, setIsMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const midi = new Midi(arrayBuffer);
      setMidiData(midi);
      onMidiLoad(midi);
    } catch (error) {
      console.error('MIDI解析错误:', error);
      setError('MIDI文件解析失败！请确保文件格式正确。');
      setMidiData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    if (onVolumeChange) {
      onVolumeChange(newVolume);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };

  // 播放时自动最小化
  useEffect(() => {
    if (isPlaying && !isPaused) {
      setIsMinimized(true);
    }
  }, [isPlaying, isPaused]);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className={`${styles.midiControls} ${isMinimized ? styles.minimized : ''}`}
      role="region"
      aria-label="MIDI播放控制器"
    >
      {/* 头部和切换按钮 */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          {selectedFile && (
            <span className={styles.fileName} title={selectedFile.name}>
              {selectedFile.name}
            </span>
          )}
          {(isPlaying || isPaused) && (
            <div 
              className={`${styles.statusIndicator} ${isPlaying ? styles.playing : styles.paused}`}
              role="status"
              aria-live="polite"
            >
              {isPlaying ? <MusicIcon size={16} /> : <PauseIcon size={16} />}
              <span className="sr-only">
                {isPlaying ? '正在播放' : '已暂停'}
              </span>
            </div>
          )}
        </div>
        <button 
          onClick={toggleMinimized}
          className={styles.toggleButton}
          aria-label={isMinimized ? "展开播放器" : "收起播放器"}
          aria-expanded={!isMinimized}
        >
          {isMinimized ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
        </button>
      </div>

      {/* 主内容区域 - 可收起 */}
      {!isMinimized && (
        <div className={styles.content}>
          {/* 文件上传区域 */}
          <div className={styles.uploadSection}>
            <input
              type="file"
              accept=".mid,.midi"
              onChange={handleFileSelect}
              ref={fileInputRef}
              style={{ display: 'none' }}
              aria-label="选择MIDI文件"
              id="midi-file-input"
            />
            
            <button 
              onClick={handleUploadClick}
              className={styles.uploadButton}
              disabled={isLoading}
              aria-label={selectedFile ? '更换MIDI文件' : '选择MIDI文件'}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingIcon size={20} />
                  <span className={styles.loading}>解析中...</span>
                </>
              ) : (
                <>
                  <UploadIcon size={20} />
                  <span>{selectedFile ? '更换' : '选择'} MIDI 文件</span>
                </>
              )}
            </button>

            {error && (
              <div className={styles.errorMessage} role="alert">
                <span>{error}</span>
              </div>
            )}

            {selectedFile && midiData && (
              <div className={styles.midiInfo} role="contentinfo">
                <span>时长: {formatTime(midiData.duration)}</span>
                <span>音轨: {midiData.tracks.length}</span>
                <span>节拍: {midiData.header.tempos[0]?.bpm || 120} BPM</span>
              </div>
            )}
          </div>

          {/* 播放控制 */}
          {midiData && (
            <div className={styles.playbackControls} role="group" aria-label="播放控制">
              <div className={styles.controlButtons}>
                <button
                  onClick={onPlay}
                  disabled={isPlaying && !isPaused}
                  className={`${styles.controlButton} ${styles.playButton}`}
                  aria-label="播放"
                  aria-pressed={isPlaying && !isPaused}
                >
                  {isPlaying && !isPaused ? (
                    <LoadingIcon size={20} />
                  ) : (
                    <PlayIcon size={20} />
                  )}
                </button>

                <button
                  onClick={onPause}
                  disabled={!isPlaying}
                  className={`${styles.controlButton} ${styles.pauseButton}`}
                  aria-label="暂停"
                  aria-pressed={isPaused}
                >
                  <PauseIcon size={20} />
                </button>

                <button
                  onClick={onStop}
                  disabled={!isPlaying && !isPaused}
                  className={`${styles.controlButton} ${styles.stopButton}`}
                  aria-label="停止"
                >
                  <StopIcon size={20} />
                </button>
              </div>

              {/* 音量控制 */}
              <div className={styles.volumeControl} role="group" aria-label="音量控制">
                <VolumeIcon size={20} className={styles.volumeLabel} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className={styles.volumeSlider}
                  aria-label="音量"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(volume * 100)}
                />
                <span className={styles.volumeValue} aria-live="off">
                  {Math.round(volume * 100)}%
                </span>
              </div>

              {/* 进度条 */}
              <div className={styles.progressSection} role="group" aria-label="播放进度">
                <div className={styles.timeDisplay}>
                  <span aria-label="当前时间">{formatTime(currentTime)}</span>
                  <span aria-label="总时长">{formatTime(duration)}</span>
                </div>
                
                <div 
                  className={styles.progressBar}
                  role="progressbar"
                  aria-label="播放进度"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressPercentage)}
                >
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 使用提示 */}
          {!midiData && !error && (
            <div className={styles.helpText} role="status">
              <p>上传MIDI文件开始播放</p>
              <p>支持 .mid 和 .midi 格式文件</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}