export const EFFECT_DURATIONS = {
  permanent: 'permanent',
  endOfTurn: 'end-of-turn',
} as const

export type EffectDuration = (typeof EFFECT_DURATIONS)[keyof typeof EFFECT_DURATIONS]