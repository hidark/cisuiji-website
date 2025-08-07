import { create } from 'zustand';
import { Midi } from '@tonejs/midi';
import { MidiPlayer, INSTRUMENTS } from '../services/midiPlayer';
import { errorHandler } from '../services/errorHandler';
import type { FingeringAssignment } from '../services/fingeringAnalyzer';
import { FingeringAnalyzer } from '../services/fingeringAnalyzer';

interface ExtractedNote {
  note: string;
  time: number;
  duration: number;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface AppState {
  // MIDI related states
  midiData: Midi | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  activeNotes: Set<string>;
  
  // Instrument states
  currentInstrument: typeof INSTRUMENTS[0];
  
  // Extracted notes states
  extractedNotes: ExtractedNote[] | null;
  isPlayingExtractedNotes: boolean;
  
  // Fingering states
  fingeringAssignments: FingeringAssignment[];
  fingeringAnalyzer: FingeringAnalyzer | null;
  
  // Player references
  midiPlayer: MidiPlayer | null;
  extractedNotesTimeouts: number[];
  
  // UI states
  isLoading: boolean;
  loadingMessage: string;
  toastMessages: ToastMessage[];
  
  // Actions
  setMidiData: (midi: Midi | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsPaused: (paused: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  addActiveNote: (note: string) => void;
  removeActiveNote: (note: string) => void;
  clearActiveNotes: () => void;
  setCurrentInstrument: (instrument: typeof INSTRUMENTS[0]) => void;
  setExtractedNotes: (notes: ExtractedNote[] | null) => void;
  setIsPlayingExtractedNotes: (playing: boolean) => void;
  setMidiPlayer: (player: MidiPlayer | null) => void;
  addExtractedNoteTimeout: (timeoutId: number) => void;
  clearExtractedNoteTimeouts: () => void;
  setFingeringAssignments: (assignments: FingeringAssignment[]) => void;
  analyzeFingeringForNotes: (notes: ExtractedNote[]) => void;
  
  // UI actions
  setLoading: (loading: boolean, message?: string) => void;
  showToast: (type: ToastMessage['type'], message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  
  // Complex actions
  initializeMidiPlayer: () => void;
  loadMidi: (midi: Midi) => Promise<void>;
  playMidi: () => Promise<void>;
  pauseMidi: () => void;
  stopMidi: () => void;
  setVolume: (volume: number) => void;
  changeInstrument: (instrumentId: string) => void;
  playExtractedNotes: () => void;
  stopExtractedNotes: () => void;
  cleanup: () => void;
}

const useAppStore = create<AppState>((set, get) => ({
  // Initial states
  midiData: null,
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  duration: 0,
  activeNotes: new Set(),
  currentInstrument: INSTRUMENTS[0],
  extractedNotes: null,
  isPlayingExtractedNotes: false,
  fingeringAssignments: [],
  fingeringAnalyzer: new FingeringAnalyzer(),
  midiPlayer: null,
  extractedNotesTimeouts: [],
  
  // UI initial states
  isLoading: false,
  loadingMessage: '',
  toastMessages: [],
  
  // Basic setters
  setMidiData: (midi) => set({ midiData: midi }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsPaused: (paused) => set({ isPaused: paused }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  
  // Active notes management
  addActiveNote: (note) => set((state) => ({
    activeNotes: new Set([...state.activeNotes, note])
  })),
  
  removeActiveNote: (note) => set((state) => {
    const newSet = new Set(state.activeNotes);
    newSet.delete(note);
    return { activeNotes: newSet };
  }),
  
  clearActiveNotes: () => set({ activeNotes: new Set() }),
  
  setCurrentInstrument: (instrument) => set({ currentInstrument: instrument }),
  setExtractedNotes: (notes) => {
    set({ 
      extractedNotes: notes,
      // Clear MIDI data when setting extracted notes
      midiData: notes ? null : get().midiData
    });
    
    // Analyze fingering for the notes
    if (notes && notes.length > 0) {
      get().analyzeFingeringForNotes(notes);
    } else {
      set({ fingeringAssignments: [] });
    }
  },
  setIsPlayingExtractedNotes: (playing) => set({ isPlayingExtractedNotes: playing }),
  setMidiPlayer: (player) => set({ midiPlayer: player }),
  
  // Timeout management
  addExtractedNoteTimeout: (timeoutId) => set((state) => ({
    extractedNotesTimeouts: [...state.extractedNotesTimeouts, timeoutId]
  })),
  
  clearExtractedNoteTimeouts: () => {
    const { extractedNotesTimeouts } = get();
    extractedNotesTimeouts.forEach(id => clearTimeout(id));
    set({ extractedNotesTimeouts: [] });
  },
  
  // Fingering actions
  setFingeringAssignments: (assignments) => set({ fingeringAssignments: assignments }),
  
  analyzeFingeringForNotes: (notes) => {
    const { fingeringAnalyzer } = get();
    if (fingeringAnalyzer && notes.length > 0) {
      const assignments = fingeringAnalyzer.analyzeNotes(notes);
      set({ fingeringAssignments: assignments });
    }
  },
  
  // UI actions
  setLoading: (loading: boolean, message?: string) => set({ 
    isLoading: loading, 
    loadingMessage: message || '' 
  }),
  
  showToast: (type: ToastMessage['type'], message: string, duration?: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    const toast: ToastMessage = { id, type, message, duration };
    set((state) => ({
      toastMessages: [...state.toastMessages, toast]
    }));
  },
  
  removeToast: (id: string) => set((state) => ({
    toastMessages: state.toastMessages.filter(t => t.id !== id)
  })),
  
  // Complex actions
  initializeMidiPlayer: () => {
    const player = new MidiPlayer({
      onNoteOn: (note: string) => {
        get().addActiveNote(note);
      },
      onNoteOff: (note: string) => {
        get().removeActiveNote(note);
      },
      onProgress: (time: number, total: number) => {
        set({ currentTime: time, duration: total });
      },
      onEnd: () => {
        set({
          isPlaying: false,
          isPaused: false,
          currentTime: 0,
          activeNotes: new Set()
        });
      }
    });
    set({ midiPlayer: player });
  },
  
  loadMidi: async (midi: Midi) => {
    try {
      get().setLoading(true, '加载MIDI文件...');
      const { midiPlayer, fingeringAnalyzer } = get();
      
      // Extract notes from MIDI for fingering analysis
      const notes: ExtractedNote[] = [];
      midi.tracks.forEach(track => {
        track.notes.forEach(note => {
          notes.push({
            note: note.name,
            time: note.time,
            duration: note.duration
          });
        });
      });
      
      // Sort notes by time
      notes.sort((a, b) => a.time - b.time);
      
      // Analyze fingering for MIDI notes
      let fingeringAssignments: FingeringAssignment[] = [];
      if (fingeringAnalyzer && notes.length > 0) {
        fingeringAssignments = fingeringAnalyzer.analyzeNotes(notes);
      }
      
      set({
        midiData: midi,
        duration: midi.duration,
        currentTime: 0,
        // Clear extracted notes when loading MIDI
        extractedNotes: null,
        isPlayingExtractedNotes: false,
        fingeringAssignments
      });
      
      if (midiPlayer) {
        await midiPlayer.loadMidi(midi);
      }
      
      get().showToast('success', 'MIDI文件加载成功');
    } catch (error) {
      errorHandler.handleMidiError(error as Error);
      get().showToast('error', '加载MIDI文件失败');
      throw error;
    } finally {
      get().setLoading(false);
    }
  },
  
  playMidi: async () => {
    try {
      const { midiPlayer, midiData } = get();
      if (midiPlayer && midiData) {
        await midiPlayer.play();
        set({ isPlaying: true, isPaused: false });
      }
    } catch (error) {
      errorHandler.handlePlaybackError(error as Error);
      set({ isPlaying: false, isPaused: false });
      throw error;
    }
  },
  
  pauseMidi: () => {
    try {
      const { midiPlayer } = get();
      if (midiPlayer) {
        midiPlayer.pause();
        set({ isPlaying: false, isPaused: true });
      }
    } catch (error) {
      errorHandler.handlePlaybackError(error as Error);
    }
  },
  
  stopMidi: () => {
    try {
      const { midiPlayer } = get();
      if (midiPlayer) {
        midiPlayer.stop();
        set({
          isPlaying: false,
          isPaused: false,
          currentTime: 0,
          activeNotes: new Set()
        });
      }
    } catch (error) {
      errorHandler.handlePlaybackError(error as Error);
    }
  },
  
  setVolume: (volume: number) => {
    const { midiPlayer } = get();
    if (midiPlayer) {
      midiPlayer.setVolume(volume);
    }
  },
  
  changeInstrument: (instrumentId: string) => {
    const { midiPlayer } = get();
    if (midiPlayer) {
      midiPlayer.setInstrument(instrumentId);
      const newInstrument = INSTRUMENTS.find(inst => inst.id === instrumentId);
      if (newInstrument) {
        set({ currentInstrument: newInstrument });
      }
    }
  },
  
  playExtractedNotes: () => {
    try {
      const { extractedNotes, midiPlayer, clearExtractedNoteTimeouts, addExtractedNoteTimeout } = get();
      if (!extractedNotes || extractedNotes.length === 0 || !midiPlayer) return;
      
      set({ isPlayingExtractedNotes: true });
      
      // Clear any existing timeouts
      clearExtractedNoteTimeouts();
      
      // Play each note at its specified time
      extractedNotes.forEach(noteData => {
        const timeoutId = window.setTimeout(() => {
          try {
            if (get().midiPlayer) {
              // Play the note
              get().midiPlayer.playNote(noteData.note, noteData.duration);
              // Add to active notes for visualization
              get().addActiveNote(noteData.note);
              // Remove from active notes after duration
              setTimeout(() => {
                get().removeActiveNote(noteData.note);
              }, noteData.duration * 1000);
            }
          } catch (error) {
            errorHandler.handlePlaybackError(error as Error);
          }
        }, noteData.time * 1000);
        addExtractedNoteTimeout(timeoutId);
      });
      
      // Calculate total duration and stop after playback
      const totalDuration = Math.max(...extractedNotes.map(n => n.time + n.duration));
      const finalTimeoutId = window.setTimeout(() => {
        set({ isPlayingExtractedNotes: false, activeNotes: new Set() });
      }, totalDuration * 1000);
      addExtractedNoteTimeout(finalTimeoutId);
    } catch (error) {
      errorHandler.handlePlaybackError(error as Error);
      set({ isPlayingExtractedNotes: false });
    }
  },
  
  stopExtractedNotes: () => {
    get().clearExtractedNoteTimeouts();
    set({
      isPlayingExtractedNotes: false,
      activeNotes: new Set()
    });
  },
  
  cleanup: () => {
    const { midiPlayer, clearExtractedNoteTimeouts } = get();
    midiPlayer?.dispose();
    clearExtractedNoteTimeouts();
    set({ midiPlayer: null });
  }
}));

export default useAppStore;