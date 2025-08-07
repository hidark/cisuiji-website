import React from 'react';

export interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export const PlayIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M8 5v14l11-7z" fill={color} />
  </svg>
);

export const PauseIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="6" y="4" width="4" height="16" fill={color} />
    <rect x="14" y="4" width="4" height="16" fill={color} />
  </svg>
);

export const StopIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" fill={color} />
  </svg>
);

export const VolumeIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" 
          stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const UploadIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" 
          stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronUpIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M18 15l-6-6-6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MusicIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M9 18V5l12-2v13M9 9l12-2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" fill={color} />
    <circle cx="18" cy="16" r="3" fill={color} />
  </svg>
);

export const LoadingIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`${className} animate-spin`} aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" opacity="0.25" />
    <path d="M12 2a10 10 0 019.39 6.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const PianoIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3" y="6" width="18" height="12" stroke={color} strokeWidth="2" rx="1" />
    <rect x="6" y="6" width="2" height="7" fill={color} />
    <rect x="10" y="6" width="2" height="7" fill={color} />
    <rect x="14" y="6" width="2" height="7" fill={color} />
    <rect x="18" y="6" width="2" height="7" fill={color} />
  </svg>
);

export const GuitarIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M20 7c0-1.1-.9-2-2-2h-1V3l-2-1v3c-1.7 0-3 1.3-3 3v4c0 1.4-.6 2.6-1.5 3.5L9 17l-3.5 3.5c-.4.4-.5 1-.5 1.5 0 1.1.9 2 2 2 .5 0 1.1-.1 1.5-.5L12 20l1.5-1.5c.9-.9 2.1-1.5 3.5-1.5h1c1.1 0 2-.9 2-2V7z" 
          stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TrumpetIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M3 12h15l3-3v6l-3-3M8 12v-2M11 12v-2M14 12v-2" 
          stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const WaveIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" 
          stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

