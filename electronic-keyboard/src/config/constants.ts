// Audio Configuration
export const AUDIO_CONFIG = {
  SAMPLE_RATE: 22050,
  BUFFER_SIZE: 2048,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  SUPPORTED_FORMATS: ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/x-wave'],
  VALID_EXTENSIONS: /\.(mp3|wav|wave)$/i,
} as const;

// Basic Pitch Configuration
export const BASIC_PITCH_CONFIG = {
  MODEL_URL: 'https://unpkg.com/@spotify/basic-pitch@1.0.1/model/model.json',
  DEFAULT_ONSET_THRESHOLD: 0.5,
  DEFAULT_FRAME_THRESHOLD: 0.3,
  MIN_NOTE_LENGTH: 50, // milliseconds
  INFER_PITCH_BENDS: true,
  WINDOW_SIZE: 2, // seconds
} as const;

// UI Configuration
export const UI_CONFIG = {
  TOAST_DURATION: 3000, // milliseconds
  ERROR_NOTIFICATION_DURATION: 5000,
  LOADING_SPINNER_SIZES: {
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large',
  },
  ANIMATION_DURATION: 300, // milliseconds
  DEBOUNCE_DELAY: 300,
} as const;

// MIDI Configuration
export const MIDI_CONFIG = {
  DEFAULT_VOLUME: 0.7,
  DEFAULT_BPM: 120,
  QUANTIZE_SUBDIVISION: 16,
  NOTE_VELOCITY: 0.8,
} as const;

// Keyboard Configuration
export const KEYBOARD_CONFIG = {
  OCTAVES: 7,
  START_OCTAVE: 2,
  WHITE_KEY_WIDTH: 40,
  BLACK_KEY_WIDTH: 24,
  KEY_HEIGHT: 160,
  BLACK_KEY_HEIGHT: 100,
} as const;

// WaveSurfer Configuration
export const WAVEFORM_CONFIG = {
  WAVE_COLOR: '#667eea',
  PROGRESS_COLOR: '#9333ea',
  CURSOR_COLOR: '#ec4899',
  HEIGHT: 80,
  NORMALIZE: true,
  BACKEND: 'WebAudio',
} as const;

// Error Configuration
export const ERROR_CONFIG = {
  MAX_LOG_SIZE: 50,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // milliseconds
} as const;

// Memory Management
export const MEMORY_CONFIG = {
  MAX_TENSOR_MEMORY: 100 * 1024 * 1024, // 100MB
  CLEANUP_INTERVAL: 60000, // 1 minute
  MAX_AUDIO_BUFFERS: 5,
} as const;

// Colors
export const COLORS = {
  PRIMARY: '#667eea',
  SECONDARY: '#764ba2',
  ACCENT: '#ec4899',
  SUCCESS: '#10b981',
  ERROR: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#3b82f6',
  BACKGROUND: {
    PRIMARY: '#1a0a2e',
    SECONDARY: '#16213e',
    TERTIARY: '#0f3460',
  },
} as const;

// Pitch Ranges (MIDI note numbers)
export const PITCH_RANGES = {
  BASS: { MIN: 0, MAX: 47 }, // Below C3
  HARMONY: { MIN: 48, MAX: 72 }, // C3 to C5
  MELODY: { MIN: 73, MAX: 127 }, // Above C5
} as const;

// Note Names
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

// Chord Intervals
export const CHORD_INTERVALS = {
  MAJOR: [4, 7],
  MINOR: [3, 7],
  DIMINISHED: [3, 6],
  AUGMENTED: [4, 8],
  MAJOR_7TH: [4, 7, 11],
  MINOR_7TH: [3, 7, 10],
  DOMINANT_7TH: [4, 7, 10],
} as const;

// File Size Limits
export const FILE_LIMITS = {
  MAX_MIDI_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_AUDIO_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_WAVEFORM_POINTS: 10000,
} as const;

// Performance Optimization
export const PERFORMANCE = {
  DEBOUNCE_MS: 300,
  THROTTLE_MS: 100,
  MAX_CONCURRENT_NOTES: 50,
  BATCH_SIZE: 100,
} as const;