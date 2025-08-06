import { useState, useRef, useEffect } from 'react';
import { Midi } from '@tonejs/midi';
import { Keyboard } from './components/Keyboard/Keyboard';
import { MidiControls } from './components/MidiControls/MidiControls';
import { InstrumentSelector } from './components/InstrumentSelector/InstrumentSelector';
import { AudioAnalyzer } from './components/AudioAnalyzer/AudioAnalyzer';
import { MidiPlayer, INSTRUMENTS } from './services/midiPlayer';
import './App.css';

function App() {
  const [midiData, setMidiData] = useState<Midi | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [currentInstrument, setCurrentInstrument] = useState(INSTRUMENTS[0]);
  const [extractedNotes, setExtractedNotes] = useState<Array<{note: string, time: number, duration: number}> | null>(null);
  const [isPlayingExtractedNotes, setIsPlayingExtractedNotes] = useState(false);
  
  const midiPlayerRef = useRef<MidiPlayer | null>(null);
  const extractedNotesTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    // 初始化MIDI播放器
    midiPlayerRef.current = new MidiPlayer({
      onNoteOn: (note: string) => {
        setActiveNotes(prev => new Set([...prev, note]));
      },
      onNoteOff: (note: string) => {
        setActiveNotes(prev => {
          const newSet = new Set(prev);
          newSet.delete(note);
          return newSet;
        });
      },
      onProgress: (time: number, total: number) => {
        setCurrentTime(time);
        setDuration(total);
      },
      onEnd: () => {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentTime(0);
        setActiveNotes(new Set());
      }
    });

    return () => {
      midiPlayerRef.current?.dispose();
      extractedNotesTimeoutsRef.current.forEach(id => clearTimeout(id));
      extractedNotesTimeoutsRef.current = [];
    };
  }, []);

  const handleMidiLoad = async (midi: Midi) => {
    setMidiData(midi);
    setDuration(midi.duration);
    setCurrentTime(0);
    
    if (midiPlayerRef.current) {
      await midiPlayerRef.current.loadMidi(midi);
    }
  };

  const handlePlay = async () => {
    if (midiPlayerRef.current && midiData) {
      await midiPlayerRef.current.play();
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  const handlePause = () => {
    if (midiPlayerRef.current) {
      midiPlayerRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (midiPlayerRef.current) {
      midiPlayerRef.current.stop();
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentTime(0);
      setActiveNotes(new Set());
    }
  };

  const handleVolumeChange = (volume: number) => {
    if (midiPlayerRef.current) {
      midiPlayerRef.current.setVolume(volume);
    }
  };

  const handleInstrumentChange = (instrumentId: string) => {
    if (midiPlayerRef.current) {
      midiPlayerRef.current.setInstrument(instrumentId);
      const newInstrument = INSTRUMENTS.find(inst => inst.id === instrumentId);
      if (newInstrument) {
        setCurrentInstrument(newInstrument);
      }
    }
  };

  const handleExtractedNotesReceived = (notes: Array<{note: string, time: number, duration: number}>) => {
    setExtractedNotes(notes);
    // Stop any existing MIDI playback
    handleStop();
  };

  const handlePlayExtractedNotes = () => {
    if (!extractedNotes || extractedNotes.length === 0 || !midiPlayerRef.current) return;
    
    setIsPlayingExtractedNotes(true);
    
    // Clear any existing timeouts
    extractedNotesTimeoutsRef.current.forEach(id => clearTimeout(id));
    extractedNotesTimeoutsRef.current = [];
    
    // Play each note at its specified time
    extractedNotes.forEach(noteData => {
      const timeoutId = setTimeout(() => {
        if (midiPlayerRef.current) {
          // Play the note
          midiPlayerRef.current.playNote(noteData.note, noteData.duration);
          // Add to active notes for visualization
          setActiveNotes(prev => new Set([...prev, noteData.note]));
          // Remove from active notes after duration
          setTimeout(() => {
            setActiveNotes(prev => {
              const newSet = new Set(prev);
              newSet.delete(noteData.note);
              return newSet;
            });
          }, noteData.duration * 1000);
        }
      }, noteData.time * 1000);
      extractedNotesTimeoutsRef.current.push(timeoutId);
    });
    
    // Calculate total duration and stop after playback
    const totalDuration = Math.max(...extractedNotes.map(n => n.time + n.duration));
    const finalTimeoutId = setTimeout(() => {
      setIsPlayingExtractedNotes(false);
      setActiveNotes(new Set());
    }, totalDuration * 1000);
    extractedNotesTimeoutsRef.current.push(finalTimeoutId);
  };

  const handleStopExtractedNotes = () => {
    extractedNotesTimeoutsRef.current.forEach(id => clearTimeout(id));
    extractedNotesTimeoutsRef.current = [];
    setIsPlayingExtractedNotes(false);
    setActiveNotes(new Set());
  };

  return (
    <div className="app">
      <main className="app-main">
        <section className="midi-section">
          <MidiControls
            onMidiLoad={handleMidiLoad}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onVolumeChange={handleVolumeChange}
            isPlaying={isPlaying}
            isPaused={isPaused}
            currentTime={currentTime}
            duration={duration}
          />
        </section>

        <section className="keyboard-section">
          <Keyboard activeNotes={activeNotes} />
        </section>
        
        {/* 音频分析器 */}
        <AudioAnalyzer
          onNotesExtracted={handleExtractedNotesReceived}
          onPlay={handlePlayExtractedNotes}
          onStop={handleStopExtractedNotes}
          isPlaying={isPlayingExtractedNotes}
        />
        
        {/* 音色选择器 - 外置独立组件 */}
        <InstrumentSelector 
          currentInstrument={currentInstrument}
          onInstrumentChange={handleInstrumentChange}
        />
      </main>
    </div>
  );
}

export default App;