import { useEffect, useCallback, lazy, Suspense } from 'react';
import { Midi } from '@tonejs/midi';
import { Keyboard } from './components/Keyboard/Keyboard';
import { UnifiedFileUploader } from './components/UnifiedFileUploader';
import { HandVisualization } from './components/HandVisualization';
import { ErrorNotification } from './components/ErrorNotification/ErrorNotification';
import { LoadingSpinner } from './components/LoadingSpinner/LoadingSpinner';
import { Toast } from './components/Toast/Toast';
import useAppStore from './store/appStore';
import './App.css';

// 优化: 懒加载非必须组件
const InstrumentSelector = lazy(() => import('./components/InstrumentSelector/InstrumentSelector').then(module => ({ default: module.InstrumentSelector })));

function App() {
  const {
    isPlaying,
    isPaused,
    currentTime,
    duration,
    activeNotes,
    currentInstrument,
    isPlayingExtractedNotes,
    extractedNotes,
    midiData,
    fingeringAssignments,
    isLoading,
    loadingMessage,
    toastMessages,
    initializeMidiPlayer,
    loadMidi,
    playMidi,
    pauseMidi,
    stopMidi,
    setVolume,
    changeInstrument,
    setExtractedNotes,
    playExtractedNotes,
    stopExtractedNotes,
    removeToast,
    cleanup
  } = useAppStore();

  useEffect(() => {
    // 初始化MIDI播放器
    initializeMidiPlayer();

    return () => {
      cleanup();
    };
  }, [initializeMidiPlayer, cleanup]);

  const handleMidiLoad = useCallback(async (midi: Midi) => {
    // Clear any extracted notes when loading MIDI
    setExtractedNotes(null);
    await loadMidi(midi);
  }, [loadMidi, setExtractedNotes]);

  const handlePlay = useCallback(async () => {
    await playMidi();
  }, [playMidi]);

  const handlePause = useCallback(() => {
    pauseMidi();
  }, [pauseMidi]);

  const handleStop = useCallback(() => {
    stopMidi();
  }, [stopMidi]);

  const handleVolumeChange = useCallback((volume: number) => {
    setVolume(volume);
  }, [setVolume]);

  const handleInstrumentChange = useCallback((instrumentId: string) => {
    changeInstrument(instrumentId);
  }, [changeInstrument]);

  const handleExtractedNotesReceived = useCallback((notes: Array<{note: string, time: number, duration: number}>) => {
    setExtractedNotes(notes);
    // Stop any existing MIDI playback
    stopMidi();
  }, [setExtractedNotes, stopMidi]);

  const handlePlayExtractedNotes = useCallback(() => {
    playExtractedNotes();
  }, [playExtractedNotes]);

  const handleStopExtractedNotes = useCallback(() => {
    stopExtractedNotes();
  }, [stopExtractedNotes]);

  // 统一处理播放和停止
  const handleUnifiedPlay = useCallback(() => {
    // 如果有提取的音符（从音频分析），播放它们；否则播放MIDI
    if (extractedNotes && extractedNotes.length > 0) {
      playExtractedNotes();
    } else if (midiData) {
      playMidi();
    }
  }, [extractedNotes, midiData, playExtractedNotes, playMidi]);

  const handleUnifiedStop = useCallback(() => {
    stopMidi();
    stopExtractedNotes();
  }, [stopMidi, stopExtractedNotes]);

  return (
    <div className="app">
      <main className="app-main">
        <section className="file-uploader-section">
          <UnifiedFileUploader
            onMidiLoad={handleMidiLoad}
            onAudioNotesExtracted={handleExtractedNotesReceived}
            onPlay={handleUnifiedPlay}
            onPause={handlePause}
            onStop={handleUnifiedStop}
            onVolumeChange={handleVolumeChange}
            isPlaying={isPlaying || isPlayingExtractedNotes}
            isPaused={isPaused}
            currentTime={currentTime}
            duration={duration}
          />
        </section>

        <section className="keyboard-section">
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* 键盘 */}
            <Keyboard 
              activeNotes={activeNotes} 
              fingeringAssignments={fingeringAssignments}
              currentTime={currentTime}
            />
            
            {/* 手部可视化 - 覆盖在键盘上方 */}
            {fingeringAssignments.length > 0 && (
              <HandVisualization 
                assignments={fingeringAssignments}
                currentTime={currentTime}
                isPlaying={isPlaying || isPlayingExtractedNotes}
              />
            )}
          </div>
        </section>
        
        {/* 音色选择器 - 懒加载 */}
        <Suspense fallback={<div className="loading-spinner">加载中...</div>}>
          <InstrumentSelector 
            currentInstrument={currentInstrument}
            onInstrumentChange={handleInstrumentChange}
          />
        </Suspense>
      </main>
      <ErrorNotification />
      {isLoading && <LoadingSpinner message={loadingMessage} fullScreen />}
      <Toast messages={toastMessages} onRemove={removeToast} />
    </div>
  );
}

export default App;