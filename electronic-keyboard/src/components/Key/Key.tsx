import { memo, useCallback } from 'react';
import { Hand, Finger } from '../../services/fingeringAnalyzer';
import styles from './Key.module.css';

interface KeyProps {
  note: string;
  isBlack: boolean;
  isPressed: boolean;
  onClick: (note: string) => void;
  'data-note'?: string;
  fingering?: {
    hand: Hand;
    finger: Finger;
  };
}

export const Key = memo(function Key({ note, isBlack, isPressed, onClick, fingering, ...props }: KeyProps) {
  const keyClassName = `
    ${styles.key}
    ${isBlack ? styles.black : styles.white}
    ${isPressed ? styles.pressed : ''}
    ${fingering ? styles.withFingering : ''}
    ${fingering?.hand === Hand.LEFT ? styles.leftHand : ''}
    ${fingering?.hand === Hand.RIGHT ? styles.rightHand : ''}
  `;

  const handleClick = useCallback(() => {
    onClick(note);
  }, [note, onClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(note);
    }
  }, [note, onClick]);

  const getFingerName = (finger: Finger): string => {
    const fingerNames: Record<Finger, string> = {
      [Finger.THUMB]: '1',
      [Finger.INDEX]: '2',
      [Finger.MIDDLE]: '3',
      [Finger.RING]: '4',
      [Finger.PINKY]: '5'
    };
    return fingerNames[finger];
  };

  return (
    <div 
      className={keyClassName} 
      onClick={handleClick}
      data-note={note}
      aria-label={`Piano key ${note}${fingering ? ` - ${fingering.hand} hand, finger ${fingering.finger}` : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <span className={styles.noteName}>{note}</span>
      {fingering && (
        <div className={styles.fingeringIndicator}>
          <span className={styles.fingerNumber}>
            {getFingerName(fingering.finger)}
          </span>
          <span className={styles.handIndicator}>
            {fingering.hand === Hand.LEFT ? 'L' : 'R'}
          </span>
        </div>
      )}
    </div>
  );
});