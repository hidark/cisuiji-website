import { FC } from 'react';
import { VolumeIcon } from '../Icons';
import styles from './MidiControls.module.css';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  disabled?: boolean;
}

export const VolumeControl: FC<VolumeControlProps> = ({
  volume,
  onVolumeChange,
  disabled = false
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(event.target.value));
  };

  const volumePercentage = Math.round(volume * 100);

  return (
    <div className={styles.volumeControl}>
      <VolumeIcon size={20} />
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={handleChange}
        className={styles.volumeSlider}
        disabled={disabled}
        aria-label="音量"
      />
      <span className={styles.volumeValue}>{volumePercentage}%</span>
    </div>
  );
};