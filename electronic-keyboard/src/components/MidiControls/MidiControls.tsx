import { useState, useEffect } from 'react';
import { Midi } from '@tonejs/midi';
import { ChevronUpIcon, ChevronDownIcon, MusicIcon, PauseIcon } from '../Icons';
import { FileUploader } from './FileUploader';
import { PlaybackControls } from './PlaybackControls';
import { VolumeControl } from './VolumeControl';
import { ProgressBar } from './ProgressBar';
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

  // 播放时自动最小化
  useEffect(() => {
    if (isPlaying && !isPaused) {
      setIsMinimized(true);
    }
  }, [isPlaying, isPaused]);

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
          <FileUploader
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            isLoading={isLoading}
          />

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

          {/* 播放控制 */}
          {midiData && (
            <div className={styles.playbackControls} role="group" aria-label="播放控制">
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