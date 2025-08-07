import { PianoIcon, MusicIcon, GuitarIcon, TrumpetIcon, WaveIcon } from './Icons';
import type { IconProps } from './Icons';

// 音色图标映射
export const InstrumentIcons: { [key: string]: React.FC<IconProps> } = {
  piano: PianoIcon,
  organ: MusicIcon,
  guitar: GuitarIcon,
  violin: MusicIcon,
  flute: MusicIcon,
  trumpet: TrumpetIcon,
  bass: MusicIcon,
  pad: WaveIcon,
};

// 获取对应音色的图标
export const getInstrumentIcon = (instrumentId: string): React.FC<IconProps> => {
  return InstrumentIcons[instrumentId] || MusicIcon;
};