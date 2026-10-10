// Evenly design tokens — light, premium, finance-app grade.
// One accent (green), neutrals do the rest. Color always means something.

export const C = {
  bg: '#F3F5F7',
  surface: '#FFFFFF',
  surface2: '#EDF0F4',
  line: '#E3E8ED',
  lineStrong: '#CFD7DF',
  text: '#0E1319',
  muted: '#5B6875',
  faint: '#8C97A3',

  green: '#16A34A',
  greenStrong: '#15803D',
  greenDim: '#E5F4EA',

  red: '#DC2626',
  redDim: '#FCEAEA',

  amber: '#B45309',
  amberDim: '#FDF0DC',

  white: '#FFFFFF',
  black: '#0E1319',
} as const;

/** Inter font families — loaded in app/_layout.tsx */
export const F = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extra: 'Inter_800ExtraBold',
} as const;

export const R = { sm: 8, md: 12, lg: 16, xl: 22 } as const;
export const S = { xs: 6, sm: 10, md: 16, lg: 24, xl: 36 } as const;

/** Avatar hues — tinted bg + readable fg, designed for light surfaces. */
export const AVATARS = [
  { bg: '#DBEAFE', fg: '#1D4ED8' },
  { bg: '#DCFCE7', fg: '#15803D' },
  { bg: '#EDE9FE', fg: '#6D28D9' },
  { bg: '#FEF3C7', fg: '#B45309' },
  { bg: '#FCE7F3', fg: '#BE185D' },
  { bg: '#CCFBF1', fg: '#0F766E' },
  { bg: '#FEE2E2', fg: '#B91C1C' },
  { bg: '#E0E7FF', fg: '#4338CA' },
] as const;

export function avatarColors(idx: number): { bg: string; fg: string } {
  return AVATARS[((idx % AVATARS.length) + AVATARS.length) % AVATARS.length];
}

/** Subtle card shadow — used sparingly, borders do most of the work. */
export const SHADOW = {
  shadowColor: '#0E1319',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const;
