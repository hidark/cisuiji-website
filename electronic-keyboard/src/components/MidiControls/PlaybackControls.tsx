import { FC } from 'react';
import { PlayIcon, PauseIcon, StopIcon } from '../Icons';
import styles from './MidiControls.module.css';

interface PlaybackControlsProps {
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  isPlaying: boolean;
  isPaused: boolean;
  disabled?: boolean;
}

export const PlaybackControls: FC<PlaybackControlsProps> = ({
  onPlay,
  onPause,
  onStop,
  isPlaying,
  isPaused,
  disabled = false
}) => {
  return (
    <div className={styles.controls}>
      {!isPlaying || isPaused ? (
        <button 
          onClick={onPlay}
          className={styles.playButton}
          disabled={disabled}
          aria-label="播放"
        >
          <PlayIcon size={24} />
        </button>
      ) : (
        <button 
          onClick={onPause}
          className={styles.pauseButton}
          disabled={disabled}
          aria-label="暂停"
        >
          <PauseIcon size={24} />
        </button>
      )}
      
      <button 
        onClick={onStop}
        className={styles.stopButton}
        disabled={disabled || (!isPlaying && !isPaused)}
        aria-label="停止"
      >
        <StopIcon size={24} />
      </button>
    </div>
  );
};