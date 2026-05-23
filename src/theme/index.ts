// Design tokens mirroring the web app's CSS variables
// Dark mode is the primary theme (matches the web default)

export const colors = {
  // Backgrounds
  bg:       '#0a0a0f',
  bgCard:   '#111118',
  bgDeep:   '#0d0d14',

  // Text
  text1:    '#f0f0f8',
  text2:    '#a0a0b8',
  text3:    '#5a5a7a',

  // Borders
  border:   '#1e1e2e',
  borderBright: '#2a2a3e',

  // Brand
  primary:  '#3b82f6',   // hsl(220 85% 58%)
  primaryDim:'#1a2540',

  // Semantic
  green:    '#4ade80',
  greenDim: '#0a2010',
  amber:    '#f59e0b',
  amberDim: '#251a00',
  rose:     '#f43f5e',
  roseDim:  '#250a10',
  blue:     '#3b82f6',
  red:      '#ef4444',
  redDim:   '#2a0a0a',
}

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl:32,
}

export const radius = {
  sm:  6,
  md:  8,
  lg:  10,
  xl:  14,
  full: 9999,
}

export const fontSize = {
  xxs:  10,
  xs:   11,
  sm:   12,
  md:   13,
  base: 14,
  lg:   15,
  xl:   16,
  xxl:  18,
  xxxl: 22,
  hero: 28,
  serif: 34,
}

export const fontWeight = {
  normal:    '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
}
