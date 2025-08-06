import styles from './Key.module.css';

interface KeyProps {
  note: string;
  isBlack: boolean;
  isPressed: boolean;
  onClick: (note: string) => void;
  'data-note'?: string;
}

export function Key({ note, isBlack, isPressed, onClick, ...props }: KeyProps) {
  const keyClassName = `
    ${styles.key}
    ${isBlack ? styles.black : styles.white}
    ${isPressed ? styles.pressed : ''}
  `;

  return (
    <div 
      className={keyClassName} 
      onClick={() => onClick(note)}
      data-note={note}
      aria-label={`Piano key ${note}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(note);
        }
      }}
      {...props}
    >
      <span className={styles.noteName}>{note}</span>
    </div>
  );
}