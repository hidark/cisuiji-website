import styles from './Key.module.css';

interface KeyProps {
  note: string;
  isBlack: boolean;
  isPressed: boolean;
  onClick: (note: string) => void;
}

export function Key({ note, isBlack, isPressed, onClick }: KeyProps) {
  const keyClassName = `
    ${styles.key}
    ${isBlack ? styles.black : styles.white}
    ${isPressed ? styles.pressed : ''}
  `;

  return (
    <div className={keyClassName} onClick={() => onClick(note)}>
      <span className={styles.noteName}>{note}</span>
    </div>
  );
}
