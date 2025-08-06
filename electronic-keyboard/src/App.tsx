import { useState, useRef, useEffect } from 'react';
import { Midi } from '@tonejs/midi';
import { Keyboard } from './components/Keyboard/Keyboard';
import { MidiControls } from './components/MidiControls/MidiControls';
import { InstrumentSelector } from './components/InstrumentSelector/InstrumentSelector';
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
  
  const midiPlayerRef = useRef<MidiPlayer | null>(null);

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