import { memo, useCallback } from 'react';
import styles from './Key.module.css';

interface KeyProps {
  note: string;
  isBlack: boolean;
  isPressed: boolean;
  onClick: (note: string) => void;
  'data-note'?: string;
}

export const Key = memo(function Key({ note, isBlack, isPressed, onClick, ...props }: KeyProps) {
  const keyClassName = `
    ${styles.key}
    ${isBlack ? styles.black : styles.white}
    ${isPressed ? styles.pressed : ''}
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

  return (
    <div 
      className={keyClassName} 
      onClick={handleClick}
      data-note={note}
      aria-label={`Piano key ${note}`}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <span className={styles.noteName}>{note}</span>
    </div>
  );
});