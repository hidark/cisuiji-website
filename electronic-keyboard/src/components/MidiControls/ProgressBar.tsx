import { FC } from 'react';
import styles from './MidiControls.module.css';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
}

export const ProgressBar: FC<ProgressBarProps> = ({ currentTime, duration }) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.progressSection}>
      <div className={styles.timeDisplay}>
        <span>{formatTime(currentTime)}</span>
        <span>/</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
};