export const EFFECT_TARGET_SELECTIONS = {
  source: 'source',
  event: 'event',
  one: 'one',
  all: 'all',
  upTo: 'up-to',
} as const

export const EFFECT_TARGET_CONTROLLERS = {
  you: 'you',
  opponent: 'opponent',
  any: 'any',
} as const

export type EffectTargetSelection =
  (typeof EFFECT_TARGET_SELECTIONS)[keyof typeof EFFECT_TARGET_SELECTIONS]
export type EffectTargetController =
  (typeof EFFECT_TARGET_CONTROLLERS)[keyof typeof EFFECT_TARGET_CONTROLLERS]
export type PendingEffectTargetSelection =
  | typeof EFFECT_TARGET_SELECTIONS.one
  | typeof EFFECT_TARGET_SELECTIONS.upTo