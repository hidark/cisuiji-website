import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Key } from '../Key/Key';
import { generateFullKeyboard, generateResponsiveKeyboard, getFrequency, getKeyNote } from '../../utils/musicUtils';
import { ChevronDownIcon } from '../Icons';
import type { FingeringAssignment } from '../../services/fingeringAnalyzer';
import { Hand, Finger } from '../../services/fingeringAnalyzer';
import styles from './Keyboard.module.css';

interface KeyboardProps {
  activeNotes?: Set<string>;
  fingeringAssignments?: FingeringAssignment[];
  currentTime?: number;
}

export function Keyboard({ 
  activeNotes = new Set(), 
  fingeringAssignments = [],
  currentTime = 0 
}: KeyboardProps) {
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const keyboardWrapperRef = useRef<HTMLDivElement>(null);
  const keyboardRef = useRef<HTMLDivElement>(null);
  
  // 获取当前时间的指法分配
  const currentFingering = useMemo(() => {
    const current = new Map<string, { hand: Hand; finger: Finger }>();
    fingeringAssignments.forEach(assignment => {
      if (assignment.time <= currentTime && assignment.time + assignment.duration >= currentTime) {
        current.set(assignment.note, {
          hand: assignment.hand,
          finger: assignment.finger
        });
      }
    });
    return current;
  }, [fingeringAssignments, currentTime]);
  
  // 根据屏幕宽度生成适当数量的键 - 使用useMemo优化
  const allKeys = useMemo(() => {
    return screenWidth >= 768 ? generateFullKeyboard() : generateResponsiveKeyboard(screenWidth);
  }, [screenWidth]);

  useEffect(() => {
    setAudioContext(new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)());
  }, []);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 检查是否需要显示滚动提示
  useEffect(() => {
    const checkScroll = () => {
      const wrapper = keyboardWrapperRef.current;
      if (!wrapper) return;
      
      const hasScroll = wrapper.scrollWidth > wrapper.clientWidth;
      if (hasScroll) {
        setShowLeftScroll(wrapper.scrollLeft > 0);
        setShowRightScroll(wrapper.scrollLeft + wrapper.clientWidth < wrapper.scrollWidth - 1);
      } else {
        setShowLeftScroll(false);
        setShowRightScroll(false);
      }
    };
    
    checkScroll();
    window.addEventListener('resize', checkScroll);
    
    const wrapper = keyboardWrapperRef.current;
    if (wrapper) {
      wrapper.addEventListener('scroll', checkScroll);
    }
    
    return () => {
      window.removeEventListener('resize', checkScroll);
      if (wrapper) {
        wrapper.removeEventListener('scroll', checkScroll);
      }
    };
  }, [allKeys]);

  // 播放音符 - 使用useCallback优化
  const playNote = useCallback((note: string) => {
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
  }, [audioContext]);

  // 滚动到指定音符 - 使用useCallback优化
  const scrollToNote = useCallback((note: string) => {
    const wrapper = keyboardWrapperRef.current;
    const keyboard = keyboardRef.current;
    if (!wrapper || !keyboard) return;
    
    // 找到对应的键元素
    const keyElements = keyboard.children;
    for (let i = 0; i < keyElements.length; i++) {
      const keyElement = keyElements[i] as HTMLElement;
      if (keyElement.getAttribute('data-note') === note) {
        const keyLeft = keyElement.offsetLeft;
        const keyWidth = keyElement.offsetWidth;
        const wrapperWidth = wrapper.clientWidth;
        const scrollLeft = wrapper.scrollLeft;
        
        // 如果键不在视野内，滚动到它
        if (keyLeft < scrollLeft || keyLeft + keyWidth > scrollLeft + wrapperWidth) {
          wrapper.scrollTo({
            left: keyLeft - (wrapperWidth - keyWidth) / 2,
            behavior: 'smooth'
          });
        }
        break;
      }
    }
  }, []);

  // 键盘事件处理 - 使用useCallback优化
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const note = getKeyNote(event.key, event.altKey, event.shiftKey);
    if (note && !pressedKeys.includes(note)) {
      setPressedKeys(prev => [...prev, note]);
      playNote(note);
      
      // 自动滚动到按下的键
      scrollToNote(note);
    }
  }, [pressedKeys, playNote, scrollToNote]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const note = getKeyNote(event.key, event.altKey, event.shiftKey);
    if (note) {
      setPressedKeys(prev => prev.filter(k => k !== note));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // 点击播放音符 - 使用useCallback优化
  const handleKeyClick = useCallback((note: string) => {
    playNote(note);
    setPressedKeys(prev => [...prev, note]);
    setTimeout(() => {
      setPressedKeys(prev => prev.filter(k => k !== note));
    }, 200);
  }, [playNote]);

  // 初始滚动到中间位置（C4附近）
  useEffect(() => {
    const wrapper = keyboardWrapperRef.current;
    if (wrapper && wrapper.scrollWidth > wrapper.clientWidth) {
      // 滚动到大约中间位置
      setTimeout(() => {
        wrapper.scrollTo({
          left: (wrapper.scrollWidth - wrapper.clientWidth) / 2,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [allKeys]);

  return (
    <div className={styles.keyboardContainer}>
      {/* 左侧滚动提示 */}
      {showLeftScroll && (
        <div className={`${styles.scrollHint} ${styles.scrollHintLeft}`}>
          <div style={{ transform: 'rotate(90deg)' }}>
            <ChevronDownIcon size={24} />
          </div>
        </div>
      )}
      
      {/* 键盘区域 */}
      <div className={styles.keyboardWrapper} ref={keyboardWrapperRef}>
        <div className={styles.keyboard} ref={keyboardRef}>
          {allKeys.map(({ note, black }) => {
            const fingering = currentFingering.get(note);
            return (
              <Key
                key={note}
                note={note}
                isBlack={black}
                isPressed={pressedKeys.includes(note) || activeNotes.has(note)}
                onClick={handleKeyClick}
                data-note={note}
                fingering={fingering}
              />
            );
          })}
        </div>
      </div>
      
      {/* 右侧滚动提示 */}
      {showRightScroll && (
        <div className={`${styles.scrollHint} ${styles.scrollHintRight}`}>
          <div style={{ transform: 'rotate(-90deg)' }}>
            <ChevronDownIcon size={24} />
          </div>
        </div>
      )}
    </div>
  );
}