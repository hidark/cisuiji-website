export enum Hand {
  LEFT = 'left',
  RIGHT = 'right'
}

export enum Finger {
  THUMB = 1,
  INDEX = 2,
  MIDDLE = 3,
  RING = 4,
  PINKY = 5
}

export interface FingeringAssignment {
  note: string;
  hand: Hand;
  finger: Finger;
  time: number;
  duration: number;
  midiNumber: number;
}

export interface HandPosition {
  hand: Hand;
  baseNote: string;
  baseMidiNumber: number;
  currentFinger: Finger;
}

export class FingeringAnalyzer {
  private static readonly MIDDLE_C_MIDI = 60;
  private static readonly HAND_SPAN = 12; // 一个八度的跨度
  private static readonly COMFORTABLE_SPAN = 8; // 舒适的手指跨度
  
  // 标准音阶指法模式
  private static readonly SCALE_FINGERING_PATTERNS = {
    major: {
      right: [1, 2, 3, 1, 2, 3, 4, 5], // C大调右手指法
      left: [5, 4, 3, 2, 1, 3, 2, 1]   // C大调左手指法
    },
    minor: {
      right: [1, 2, 3, 1, 2, 3, 4, 5],
      left: [5, 4, 3, 2, 1, 3, 2, 1]
    }
  };
  
  // 和弦指法模式
  private static readonly CHORD_FINGERING_PATTERNS = {
    triad: {
      right: { root: 1, third: 3, fifth: 5 },
      left: { root: 5, third: 3, fifth: 1 }
    },
    seventh: {
      right: { root: 1, third: 2, fifth: 4, seventh: 5 },
      left: { root: 5, third: 3, fifth: 2, seventh: 1 }
    }
  };
  
  /**
   * 分析音符序列并分配指法
   */
  public analyzeNotes(notes: Array<{note: string, time: number, duration: number}>): FingeringAssignment[] {
    const assignments: FingeringAssignment[] = [];
    const sortedNotes = [...notes].sort((a, b) => a.time - b.time);
    
    // 将音符按时间分组（同时演奏的音符）
    const noteGroups = this.groupNotesByTime(sortedNotes);
    
    // 为每组音符分配手和手指
    let leftHandPosition: HandPosition = {
      hand: Hand.LEFT,
      baseNote: 'C3',
      baseMidiNumber: 48,
      currentFinger: Finger.THUMB
    };
    
    let rightHandPosition: HandPosition = {
      hand: Hand.RIGHT,
      baseNote: 'C5',
      baseMidiNumber: 72,
      currentFinger: Finger.THUMB
    };
    
    for (const group of noteGroups) {
      const groupAssignments = this.assignFingeringToGroup(
        group,
        leftHandPosition,
        rightHandPosition
      );
      
      assignments.push(...groupAssignments);
      
      // 更新手的位置
      const lastRightNote = groupAssignments.filter(a => a.hand === Hand.RIGHT).pop();
      const lastLeftNote = groupAssignments.filter(a => a.hand === Hand.LEFT).pop();
      
      if (lastRightNote) {
        rightHandPosition.currentFinger = lastRightNote.finger;
        rightHandPosition.baseMidiNumber = lastRightNote.midiNumber;
      }
      
      if (lastLeftNote) {
        leftHandPosition.currentFinger = lastLeftNote.finger;
        leftHandPosition.baseMidiNumber = lastLeftNote.midiNumber;
      }
    }
    
    return assignments;
  }
  
  /**
   * 将音符按时间分组
   */
  private groupNotesByTime(notes: Array<{note: string, time: number, duration: number}>): Array<Array<{note: string, time: number, duration: number}>> {
    const groups: Array<Array<{note: string, time: number, duration: number}>> = [];
    let currentGroup: Array<{note: string, time: number, duration: number}> = [];
    let currentTime = -1;
    
    for (const note of notes) {
      if (Math.abs(note.time - currentTime) < 0.05) { // 50ms内视为同时
        currentGroup.push(note);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [note];
        currentTime = note.time;
      }
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }
  
  /**
   * 为一组同时演奏的音符分配指法
   */
  private assignFingeringToGroup(
    notes: Array<{note: string, time: number, duration: number}>,
    leftHandPosition: HandPosition,
    rightHandPosition: HandPosition
  ): FingeringAssignment[] {
    const assignments: FingeringAssignment[] = [];
    
    // 将音符转换为MIDI音高并排序
    const notesWithMidi = notes.map(n => ({
      ...n,
      midiNumber: this.noteToMidi(n.note)
    })).sort((a, b) => a.midiNumber - b.midiNumber);
    
    // 根据音高范围分配左右手
    const middlePoint = FingeringAnalyzer.MIDDLE_C_MIDI;
    const leftHandNotes = notesWithMidi.filter(n => n.midiNumber < middlePoint);
    const rightHandNotes = notesWithMidi.filter(n => n.midiNumber >= middlePoint);
    
    // 处理和弦情况
    if (notes.length >= 3) {
      // 检测是否为和弦
      const chordAssignments = this.assignChordFingering(notesWithMidi);
      if (chordAssignments.length > 0) {
        return chordAssignments;
      }
    }
    
    // 为左手音符分配指法
    if (leftHandNotes.length > 0) {
      const leftAssignments = this.assignHandFingering(
        leftHandNotes,
        Hand.LEFT,
        leftHandPosition
      );
      assignments.push(...leftAssignments);
    }
    
    // 为右手音符分配指法
    if (rightHandNotes.length > 0) {
      const rightAssignments = this.assignHandFingering(
        rightHandNotes,
        Hand.RIGHT,
        rightHandPosition
      );
      assignments.push(...rightAssignments);
    }
    
    return assignments;
  }
  
  /**
   * 为单手的音符分配指法
   */
  private assignHandFingering(
    notes: Array<{note: string, time: number, duration: number, midiNumber: number}>,
    hand: Hand,
    handPosition: HandPosition
  ): FingeringAssignment[] {
    const assignments: FingeringAssignment[] = [];
    
    for (const note of notes) {
      const finger = this.calculateOptimalFinger(
        note.midiNumber,
        handPosition.baseMidiNumber,
        hand,
        notes.length > 1
      );
      
      assignments.push({
        note: note.note,
        hand,
        finger,
        time: note.time,
        duration: note.duration,
        midiNumber: note.midiNumber
      });
    }
    
    return assignments;
  }
  
  /**
   * 计算最优手指
   */
  private calculateOptimalFinger(
    targetMidi: number,
    baseMidi: number,
    hand: Hand,
    isChord: boolean
  ): Finger {
    const interval = targetMidi - baseMidi;
    const absInterval = Math.abs(interval);
    
    // 如果是和弦，使用和弦指法
    if (isChord) {
      return this.getChordFinger(interval, hand);
    }
    
    // 音阶或旋律指法
    if (absInterval <= 2) {
      // 相邻音符
      return hand === Hand.RIGHT ? Finger.INDEX : Finger.RING;
    } else if (absInterval <= 4) {
      // 三度音程
      return Finger.MIDDLE;
    } else if (absInterval <= 7) {
      // 五度音程
      return hand === Hand.RIGHT ? Finger.RING : Finger.INDEX;
    } else {
      // 大跨度
      return hand === Hand.RIGHT ? Finger.PINKY : Finger.THUMB;
    }
  }
  
  /**
   * 获取和弦指法
   */
  private getChordFinger(interval: number, hand: Hand): Finger {
    const absInterval = Math.abs(interval);
    
    if (hand === Hand.RIGHT) {
      if (interval === 0) return Finger.THUMB;
      if (absInterval <= 4) return Finger.MIDDLE;
      if (absInterval <= 7) return Finger.PINKY;
    } else {
      if (interval === 0) return Finger.PINKY;
      if (absInterval <= 4) return Finger.MIDDLE;
      if (absInterval <= 7) return Finger.THUMB;
    }
    
    return Finger.MIDDLE;
  }
  
  /**
   * 检测并分配和弦指法
   */
  private assignChordFingering(
    notes: Array<{note: string, time: number, duration: number, midiNumber: number}>
  ): FingeringAssignment[] {
    const assignments: FingeringAssignment[] = [];
    
    // 简单的三和弦检测
    if (notes.length === 3) {
      const intervals = [
        notes[1].midiNumber - notes[0].midiNumber,
        notes[2].midiNumber - notes[1].midiNumber
      ];
      
      // 检查是否为标准三和弦（大三和弦或小三和弦）
      const isMajorTriad = intervals[0] === 4 && intervals[1] === 3;
      const isMinorTriad = intervals[0] === 3 && intervals[1] === 4;
      
      if (isMajorTriad || isMinorTriad) {
        // 根据音高范围决定使用哪只手
        const avgMidi = notes.reduce((sum, n) => sum + n.midiNumber, 0) / notes.length;
        const hand = avgMidi >= FingeringAnalyzer.MIDDLE_C_MIDI ? Hand.RIGHT : Hand.LEFT;
        
        const fingering = FingeringAnalyzer.CHORD_FINGERING_PATTERNS.triad[hand];
        
        assignments.push({
          ...notes[0],
          hand,
          finger: fingering.root
        });
        
        assignments.push({
          ...notes[1],
          hand,
          finger: fingering.third
        });
        
        assignments.push({
          ...notes[2],
          hand,
          finger: fingering.fifth
        });
        
        return assignments;
      }
    }
    
    return [];
  }
  
  /**
   * 将音符名转换为MIDI音高数字
   */
  private noteToMidi(note: string): number {
    const noteMap: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    
    const match = note.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) return 60; // 默认返回中央C
    
    const [, noteName, octaveStr] = match;
    const octave = parseInt(octaveStr);
    const noteValue = noteMap[noteName] || 0;
    
    return (octave + 1) * 12 + noteValue;
  }
  
  /**
   * 生成指法建议文本
   */
  public generateFingeringText(assignments: FingeringAssignment[]): string {
    const suggestions: string[] = [];
    
    // 按时间分组
    const timeGroups = new Map<number, FingeringAssignment[]>();
    for (const assignment of assignments) {
      const timeKey = Math.round(assignment.time * 10) / 10;
      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, []);
      }
      timeGroups.get(timeKey)!.push(assignment);
    }
    
    // 生成建议
    for (const [time, group] of timeGroups) {
      const leftHand = group.filter(a => a.hand === Hand.LEFT);
      const rightHand = group.filter(a => a.hand === Hand.RIGHT);
      
      let suggestion = `${time.toFixed(1)}s: `;
      
      if (leftHand.length > 0) {
        const leftFingers = leftHand.map(a => `${a.note}(${a.finger})`).join('-');
        suggestion += `左手: ${leftFingers} `;
      }
      
      if (rightHand.length > 0) {
        const rightFingers = rightHand.map(a => `${a.note}(${a.finger})`).join('-');
        suggestion += `右手: ${rightFingers}`;
      }
      
      suggestions.push(suggestion);
    }
    
    return suggestions.join('\n');
  }
}