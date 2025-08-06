import { useState, useRef, useEffect } from 'react';
import { Midi } from '@tonejs/midi';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const midi = new Midi(arrayBuffer);
      setMidiData(midi);
      onMidiLoad(midi);
    } catch (error) {
      console.error('MIDI解析错误:', error);
      alert('MIDI文件解析失败！请确保文件格式正确。');
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
    <div className={`${styles.midiControls} ${isMinimized ? styles.minimized : ''}`}>
      {/* 头部和切换按钮 */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          {selectedFile && (
            <span className={styles.fileName}>{selectedFile.name}</span>
          )}
          {(isPlaying || isPaused) && (
            <div className={`${styles.statusIndicator} ${isPlaying ? styles.playing : styles.paused}`}>
              {isPlaying ? '🎵' : '⏸️'}
            </div>
          )}
        </div>
        <button 
          onClick={toggleMinimized}
          className={styles.toggleButton}
          title={isMinimized ? "展开播放器" : "收起播放器"}
        >
          {isMinimized ? '⬆️' : '⬇️'}
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
            />
            
            <button 
              onClick={handleUploadClick}
              className={styles.uploadButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className={styles.loading}>⏳ 解析中...</span>
              ) : (
                <>
                  📁 {selectedFile ? '更换' : '选择'} MIDI 文件
                </>
              )}
            </button>

            {selectedFile && midiData && (
              <div className={styles.midiInfo}>
                <span>时长: {formatTime(midiData.duration)}</span>
                <span>音轨: {midiData.tracks.length}</span>
                <span>节拍: {midiData.header.tempos[0]?.bpm || 120} BPM</span>
              </div>
            )}
          </div>

          {/* 播放控制 */}
          {midiData && (
            <div className={styles.playbackControls}>
              <div className={styles.controlButtons}>
                <button
                  onClick={onPlay}
                  disabled={isPlaying && !isPaused}
                  className={`${styles.controlButton} ${styles.playButton}`}
                  title="播放"
                >
                  {isPlaying && !isPaused ? '🔄' : '▶️'}
                </button>

                <button
                  onClick={onPause}
                  disabled={!isPlaying}
                  className={`${styles.controlButton} ${styles.pauseButton}`}
                  title="暂停"
                >
                  ⏸️
                </button>

                <button
                  onClick={onStop}
                  disabled={!isPlaying && !isPaused}
                  className={`${styles.controlButton} ${styles.stopButton}`}
                  title="停止"
                >
                  ⏹️
                </button>
              </div>

              {/* 音量控制 */}
              <div className={styles.volumeControl}>
                <span className={styles.volumeLabel}>🔊</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className={styles.volumeSlider}
                  title={`音量: ${Math.round(volume * 100)}%`}
                />
                <span className={styles.volumeValue}>{Math.round(volume * 100)}%</span>
              </div>

              {/* 进度条 */}
              <div className={styles.progressSection}>
                <div className={styles.timeDisplay}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 使用提示 */}
          {!midiData && (
            <div className={styles.helpText}>
              <p>💡 上传MIDI文件开始播放</p>
              <p>支持 .mid 和 .midi 格式文件</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}