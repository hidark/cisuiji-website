import { useState, useRef, useEffect } from 'react';
import { Key } from '../Key/Key';
import { generate64Keys, getFrequency, getKeyNote } from '../../utils/musicUtils';
import styles from './Keyboard.module.css';

interface KeyboardProps {
  activeNotes?: Set<string>;
}

export function Keyboard({ activeNotes = new Set() }: KeyboardProps) {
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const keyboardRef = useRef<HTMLDivElement>(null);
  
  // 生成所有64个键
  const allKeys = generate64Keys();

  useEffect(() => {
    setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)());
  }, []);

  // 播放音符
  const playNote = (note: string) => {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    const frequency = getFrequency(note);
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 1.5);
  };

  // 键盘事件处理
  const handleKeyDown = (event: KeyboardEvent) => {
    const note = getKeyNote(event.key, event.altKey, event.shiftKey);
    if (note && !pressedKeys.includes(note)) {
      setPressedKeys(prev => [...prev, note]);
      playNote(note);
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    const note = getKeyNote(event.key, event.altKey, event.shiftKey);
    if (note) {
      setPressedKeys(prev => prev.filter(k => k !== note));
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [pressedKeys]);

  // 点击播放音符
  const handleKeyClick = (note: string) => {
    playNote(note);
    setPressedKeys(prev => [...prev, note]);
    setTimeout(() => {
      setPressedKeys(prev => prev.filter(k => k !== note));
    }, 200);
  };


  return (
    <div className={styles.keyboardContainer}>
      {/* 键盘区域 */}
      <div className={styles.keyboardWrapper} ref={keyboardRef}>
        <div className={styles.keyboard}>
          {allKeys.map(({ note, black }) => (
            <Key
              key={note}
              note={note}
              isBlack={black}
              isPressed={pressedKeys.includes(note) || activeNotes.has(note)}
              onClick={handleKeyClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}