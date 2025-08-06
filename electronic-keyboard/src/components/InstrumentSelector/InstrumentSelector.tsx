import { useState } from 'react';
import { INSTRUMENTS, type InstrumentConfig } from '../../services/midiPlayer';
import styles from './InstrumentSelector.module.css';

interface InstrumentSelectorProps {
  currentInstrument: InstrumentConfig;
  onInstrumentChange: (instrumentId: string) => void;
  isMinimized?: boolean;
}

export function InstrumentSelector({ 
  currentInstrument, 
  onInstrumentChange,
  isMinimized = false 
}: InstrumentSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(!isMinimized);

  const handleInstrumentSelect = (instrumentId: string) => {
    onInstrumentChange(instrumentId);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`${styles.instrumentSelector} ${isExpanded ? styles.expanded : styles.collapsed}`}>
      {/* 头部 - 当前音色显示和切换按钮 */}
      <div className={styles.header} onClick={toggleExpanded}>
        <div className={styles.currentInstrument}>
          <span className={styles.icon}>🎵</span>
          <span className={styles.name}>{currentInstrument.name}</span>
        </div>
        <button className={styles.toggleButton}>
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {/* 音色选择列表 */}
      {isExpanded && (
        <div className={styles.instrumentList}>
          <div className={styles.listHeader}>
            <span>选择音色</span>
          </div>
          <div className={styles.instruments}>
            {INSTRUMENTS.map((instrument) => (
              <button
                key={instrument.id}
                className={`${styles.instrumentButton} ${
                  currentInstrument.id === instrument.id ? styles.active : ''
                }`}
                onClick={() => handleInstrumentSelect(instrument.id)}
                title={`切换到 ${instrument.name}`}
              >
                <span className={styles.instrumentIcon}>
                  {getInstrumentEmoji(instrument.id)}
                </span>
                <span className={styles.instrumentName}>
                  {instrument.name}
                </span>
              </button>
            ))}
          </div>
          
          {/* 音色提示 */}
          <div className={styles.hint}>
            💡 可在播放中实时切换音色
          </div>
        </div>
      )}
    </div>
  );
}

// 根据音色ID获取对应的emoji图标
function getInstrumentEmoji(instrumentId: string): string {
  const emojiMap: { [key: string]: string } = {
    piano: '🎹',
    organ: '🎵',
    guitar: '🎸',
    violin: '🎻',
    flute: '🪈',
    trumpet: '🎺',
    bass: '🔉',
    pad: '🌊'
  };
  
  return emojiMap[instrumentId] || '🎼';
}