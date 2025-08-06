// 音乐工具函数

export interface NoteInfo {
  note: string;
  black: boolean;
  octave: number;
  midiNumber: number;
}

// 生成完整88键钢琴键盘的音符 (A0 - C8)
export function generateFullKeyboard(): NoteInfo[] {
  const notes: NoteInfo[] = [];
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const blackKeys = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A# 的indices
  
  // 标准88键钢琴: A0到C8 (MIDI 21-108)
  // 为了更好的显示效果，我们使用C1到C8 (MIDI 24-108, 7个完整八度 + 1个音)
  for (let midiNumber = 24; midiNumber <= 108; midiNumber++) {
    const octave = Math.floor(midiNumber / 12) - 1;
    const noteIndex = midiNumber % 12;
    const noteName = noteNames[noteIndex];
    const fullNote = `${noteName}${octave}`;
    const isBlack = blackKeys.includes(noteIndex);
    
    notes.push({
      note: fullNote,
      black: isBlack,
      octave: octave,
      midiNumber: midiNumber
    });
  }
  
  return notes;
}

// 为了兼容性，保留原函数名但扩展范围
export function generate64Keys(): NoteInfo[] {
  return generateFullKeyboard();
}

// 生成响应式键盘 - 根据屏幕大小动态调整显示范围
export function generateResponsiveKeyboard(screenWidth: number): NoteInfo[] {
  const notes: NoteInfo[] = [];
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const blackKeys = [1, 3, 6, 8, 10];
  
  // 根据屏幕宽度决定显示的键数
  let startMidi: number;
  let endMidi: number;
  
  if (screenWidth >= 1440) {
    // 大屏幕：显示C1-C8 (7个八度)
    startMidi = 24;
    endMidi = 108;
  } else if (screenWidth >= 1024) {
    // 中等屏幕：显示C2-C7 (5个八度)
    startMidi = 36;
    endMidi = 96;
  } else if (screenWidth >= 768) {
    // 平板：显示C2-C6 (4个八度)
    startMidi = 36;
    endMidi = 84;
  } else {
    // 手机：显示C3-C6 (3个八度)
    startMidi = 48;
    endMidi = 84;
  }
  
  for (let midiNumber = startMidi; midiNumber <= endMidi; midiNumber++) {
    const octave = Math.floor(midiNumber / 12) - 1;
    const noteIndex = midiNumber % 12;
    const noteName = noteNames[noteIndex];
    const fullNote = `${noteName}${octave}`;
    const isBlack = blackKeys.includes(noteIndex);
    
    notes.push({
      note: fullNote,
      black: isBlack,
      octave: octave,
      midiNumber: midiNumber
    });
  }
  
  return notes;
}

// 根据音符名称计算频率
export function getFrequency(note: string): number {
  const a4 = 440;
  const semitones = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  // 解析音符名称
  let noteName: string;
  let octave: number;
  
  if (note.includes('#')) {
    noteName = note.slice(0, 2);
    octave = parseInt(note.slice(2));
  } else {
    noteName = note.slice(0, 1);
    octave = parseInt(note.slice(1));
  }
  
  const keyNumber = semitones.indexOf(noteName);
  if (keyNumber === -1) return 0;
  
  // 计算相对于A4的半音数差距
  const semitonesFromA4 = keyNumber - 9 + (octave - 4) * 12;
  
  return a4 * Math.pow(2, semitonesFromA4 / 12);
}

// MIDI note number 转换为音符名称
export function midiNumberToNote(midiNumber: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNumber / 12) - 1;
  const noteIndex = midiNumber % 12;
  return `${noteNames[noteIndex]}${octave}`;
}

// 生成键盘快捷键映射基础音符 (完整键盘1:1映射)
export function getBaseKeyMap(): { [key: string]: string } {
  return {
    // 数字键行 (1-9, 0, -, =)
    '1': 'C', '2': 'C#', '3': 'D', '4': 'D#', '5': 'E', '6': 'F', 
    '7': 'F#', '8': 'G', '9': 'G#', '0': 'A', '-': 'A#', '=': 'B',
    
    // QWERTY行
    'q': 'C', 'w': 'C#', 'e': 'D', 'r': 'D#', 't': 'E', 'y': 'F',
    'u': 'F#', 'i': 'G', 'o': 'G#', 'p': 'A', '[': 'A#', ']': 'B',
    
    // ASDF行  
    'a': 'C', 's': 'C#', 'd': 'D', 'f': 'D#', 'g': 'E', 'h': 'F',
    'j': 'F#', 'k': 'G', 'l': 'G#', ';': 'A', "'": 'A#',
    
    // ZXCV行
    'z': 'C', 'x': 'C#', 'c': 'D', 'v': 'D#', 'b': 'E', 'n': 'F',
    'm': 'F#', ',': 'G', '.': 'G#', '/': 'A',
  };
}

// 根据按键和修饰键获取完整音符名称 (多八度支持)
export function getKeyNote(key: string, altPressed: boolean, shiftPressed: boolean): string | null {
  const baseMap = getBaseKeyMap();
  const baseNote = baseMap[key.toLowerCase()];
  
  if (!baseNote) return null;
  
  // 根据键盘行设置不同八度
  const numberRowKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
  const qwertyRowKeys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'];
  const asdfRowKeys = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"];
  const zxcvRowKeys = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'];
  
  let octave = 4; // 默认八度
  
  const keyLower = key.toLowerCase();
  if (numberRowKeys.includes(keyLower)) {
    octave = 6; // 数字行最高
  } else if (qwertyRowKeys.includes(keyLower)) {
    octave = 5; // QWERTY行次高
  } else if (asdfRowKeys.includes(keyLower)) {
    octave = 4; // ASDF行中等
  } else if (zxcvRowKeys.includes(keyLower)) {
    octave = 3; // ZXCV行最低
  }
  
  // 修饰键调整八度
  if (altPressed && shiftPressed) {
    octave = Math.max(1, octave - 1); // 同时按下降低一个八度
  } else if (altPressed) {
    octave = Math.max(1, octave - 2); // Alt降低两个八度
  } else if (shiftPressed) {
    octave = Math.min(8, octave + 1); // Shift提高一个八度
  }
  
  return `${baseNote}${octave}`;
}