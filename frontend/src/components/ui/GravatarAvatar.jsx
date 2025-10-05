import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Gravatar-like avatar component that generates unique SVG avatars
 * Features:
 * - Uses first 2 characters of name
 * - Unique background color based on UserID hash
 * - Consistent colors for same user
 * - SVG-based for crisp rendering at any size
 */

// Predefined color palettes for better visual appeal
const COLOR_PALETTES = [
  ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
  ['#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'],
  ['#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'],
  ['#A9DFBF', '#F9E79F', '#FADBD8', '#D5DBDB', '#AED6F1'],
  ['#D5A6BD', '#A3E4D7', '#FCF3CF', '#D2B4DE', '#A9CCE3']
];

// Generate a simple hash from string
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

// Get unique colors based on user ID
const getColorsForUser = (userId) => {
  const hash = hashString(userId);
  const paletteIndex = hash % COLOR_PALETTES.length;
  const colorIndex = (hash >> 8) % COLOR_PALETTES[paletteIndex].length;
  
  return {
    background: COLOR_PALETTES[paletteIndex][colorIndex],
    text: '#FFFFFF', // Always white text for contrast
    secondary: COLOR_PALETTES[paletteIndex][(colorIndex + 1) % COLOR_PALETTES[paletteIndex].length]
  };
};

// Generate unique pattern based on user ID
const getPatternForUser = (userId) => {
  const hash = hashString(userId);
  const patterns = [
    'none',
    'radial',
    'linear',
    'diagonal',
    'dots'
  ];
  return patterns[hash % patterns.length];
};

// Generate SVG pattern definition
const generatePattern = (patternType, colors, size) => {
  const patternId = `pattern-${patternType}-${hashString(colors.background)}`;
  
  switch (patternType) {
    case 'radial':
      return (
        <defs>
          <radialGradient id={patternId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.background} />
            <stop offset="100%" stopColor={colors.secondary} />
          </radialGradient>
        </defs>
      );
    case 'linear':
      return (
        <defs>
          <linearGradient id={patternId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.background} />
            <stop offset="100%" stopColor={colors.secondary} />
          </linearGradient>
        </defs>
      );
    case 'diagonal':
      return (
        <defs>
          <linearGradient id={patternId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.background} />
            <stop offset="50%" stopColor={colors.secondary} />
            <stop offset="100%" stopColor={colors.background} />
          </linearGradient>
        </defs>
      );
    case 'dots':
      return (
        <defs>
          <pattern id={patternId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="2" fill={colors.secondary} opacity="0.3" />
          </pattern>
        </defs>
      );
    default:
      return null;
  }
};

const GravatarAvatar = ({ 
  name = 'User', 
  userId = 'default', 
  size = 40, 
  className = '',
  showBorder = false,
  borderColor = '#E5E7EB'
}) => {
  // Get first 2 characters, uppercase
  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Get unique colors and pattern for this user
  const colors = getColorsForUser(userId);
  const patternType = getPatternForUser(userId);
  const patternId = `pattern-${patternType}-${hashString(colors.background)}`;

  // Calculate font size based on avatar size
  const fontSize = Math.max(12, size * 0.4);
  const textY = size * 0.6;

  return (
    <div 
      className={cn(
        "inline-flex items-center justify-center rounded-full overflow-hidden",
        showBorder && "ring-2 ring-offset-2",
        className
      )}
      style={{ 
        width: size, 
        height: size,
        ...(showBorder && { ringColor: borderColor })
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rounded-full"
      >
        {generatePattern(patternType, colors, size)}
        
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2}
          fill={patternType === 'none' ? colors.background : `url(#${patternId})`}
        />
        
        {/* Text */}
        <text
          x={size / 2}
          y={textY}
          fontSize={fontSize}
          fontWeight="600"
          fill={colors.text}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {initials}
        </text>
      </svg>
    </div>
  );
};

// Export with default props
export default GravatarAvatar;

// Also export as named export for convenience
export { GravatarAvatar };
