export const EFFECT_ACTIONS = {
  modify: 'modify',
  createToken: 'create-token',
  destroy: 'destroy',
  damage: 'damage',
  addCounters: 'add-counters',
} as const

export type EffectActionId = (typeof EFFECT_ACTIONS)[keyof typeof EFFECT_ACTIONS]