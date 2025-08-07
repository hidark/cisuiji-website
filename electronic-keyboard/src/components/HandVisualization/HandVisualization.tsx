import { useEffect, useState, useRef } from 'react';
import type { FingeringAssignment } from '../../services/fingeringAnalyzer';
import { Hand, Finger } from '../../services/fingeringAnalyzer';
import styles from './HandVisualization.module.css';

interface HandVisualizationProps {
  assignments: FingeringAssignment[];
  currentTime: number;
  isPlaying: boolean;
}

interface HandState {
  position: number; // X position on keyboard
  fingers: Map<Finger, string | null>; // finger -> note being played
  isActive: boolean;
}

export function HandVisualization({ assignments, currentTime, isPlaying }: HandVisualizationProps) {
  const [leftHand, setLeftHand] = useState<HandState>({
    position: 30,
    fingers: new Map(),
    isActive: false
  });
  
  const [rightHand, setRightHand] = useState<HandState>({
    position: 60,
    fingers: new Map(),
    isActive: false
  });
  
  const keyboardRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isPlaying) {
      // Reset hands when not playing
      setLeftHand(prev => ({
        ...prev,
        fingers: new Map(),
        isActive: false
      }));
      setRightHand(prev => ({
        ...prev,
        fingers: new Map(),
        isActive: false
      }));
      return;
    }
    
    // Find current assignments based on time
    const currentAssignments = assignments.filter(a => 
      a.time <= currentTime && a.time + a.duration >= currentTime
    );
    
    // Update left hand
    const leftAssignments = currentAssignments.filter(a => a.hand === Hand.LEFT);
    const leftFingers = new Map<Finger, string | null>();
    let leftCenterNote = 0;
    
    leftAssignments.forEach(a => {
      leftFingers.set(a.finger, a.note);
      leftCenterNote += a.midiNumber;
    });
    
    if (leftAssignments.length > 0) {
      leftCenterNote /= leftAssignments.length;
      const leftPos = calculateKeyboardPosition(leftCenterNote);
      
      setLeftHand({
        position: leftPos,
        fingers: leftFingers,
        isActive: true
      });
    } else {
      setLeftHand(prev => ({
        ...prev,
        fingers: new Map(),
        isActive: false
      }));
    }
    
    // Update right hand
    const rightAssignments = currentAssignments.filter(a => a.hand === Hand.RIGHT);
    const rightFingers = new Map<Finger, string | null>();
    let rightCenterNote = 0;
    
    rightAssignments.forEach(a => {
      rightFingers.set(a.finger, a.note);
      rightCenterNote += a.midiNumber;
    });
    
    if (rightAssignments.length > 0) {
      rightCenterNote /= rightAssignments.length;
      const rightPos = calculateKeyboardPosition(rightCenterNote);
      
      setRightHand({
        position: rightPos,
        fingers: rightFingers,
        isActive: true
      });
    } else {
      setRightHand(prev => ({
        ...prev,
        fingers: new Map(),
        isActive: false
      }));
    }
  }, [assignments, currentTime, isPlaying]);
  
  // Calculate position on keyboard based on MIDI note
  const calculateKeyboardPosition = (midiNote: number): number => {
    // Map MIDI note to percentage position on keyboard (0-100)
    // C3 (48) = 25%, C4 (60) = 50%, C5 (72) = 75%
    const minNote = 36; // C2
    const maxNote = 96; // C7
    const range = maxNote - minNote;
    const position = ((midiNote - minNote) / range) * 100;
    return Math.max(0, Math.min(100, position));
  };
  
  const renderHand = (hand: 'left' | 'right', handState: HandState) => {
    const fingerNames = ['拇指', '食指', '中指', '无名指', '小指'];
    // 手指间距更大，更符合真实手指间距
    const fingerPositions = hand === 'left' 
      ? [40, 20, 0, -20, -40] // 左手：小指到拇指
      : [-40, -20, 0, 20, 40]; // 右手：拇指到小指
    
    return (
      <div 
        className={`${styles.hand} ${styles[hand]} ${handState.isActive ? styles.active : ''}`}
        style={{ left: `${handState.position}%` }}
      >
        <div className={styles.palm}>
          <span className={styles.handLabel}>
            {hand === 'left' ? '左手' : '右手'}
          </span>
        </div>
        
        <div className={styles.fingers}>
          {[1, 2, 3, 4, 5].map((fingerNum) => {
            const finger = fingerNum as Finger;
            const isPressed = handState.fingers.has(finger) && handState.fingers.get(finger) !== null;
            const note = handState.fingers.get(finger);
            
            return (
              <div
                key={finger}
                className={`${styles.finger} ${isPressed ? styles.pressed : ''}`}
                style={{ 
                  left: `${fingerPositions[fingerNum - 1]}px`,
                  transform: isPressed ? 'translateY(20px) scale(1.1)' : 'translateY(0)'
                }}
              >
                {/* 手指连接线 */}
                <div className={styles.fingerConnection} />
                
                <div className={styles.fingerTip}>
                  <span className={styles.fingerNumber}>{fingerNum}</span>
                  {isPressed && note && (
                    <span className={styles.noteLabel}>{note}</span>
                  )}
                </div>
                <div className={styles.fingerName}>
                  {fingerNames[fingerNum - 1]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  return (
    <div className={styles.handVisualization} ref={keyboardRef}>
      {leftHand.isActive && renderHand('left', leftHand)}
      {rightHand.isActive && renderHand('right', rightHand)}
      
      {/* 指法提示面板 */}
      <div className={styles.fingeringPanel}>
        <h3>当前指法</h3>
        <div className={styles.fingeringInfo}>
          {leftHand.isActive && (
            <div className={styles.handInfo}>
              <span className={styles.handTitle}>左手:</span>
              {Array.from(leftHand.fingers.entries()).map(([finger, note]) => (
                note && <span key={finger} className={styles.fingerItem}>
                  {finger}号指 → {note}
                </span>
              ))}
            </div>
          )}
          
          {rightHand.isActive && (
            <div className={styles.handInfo}>
              <span className={styles.handTitle}>右手:</span>
              {Array.from(rightHand.fingers.entries()).map(([finger, note]) => (
                note && <span key={finger} className={styles.fingerItem}>
                  {finger}号指 → {note}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}