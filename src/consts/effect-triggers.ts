export const EFFECT_TRIGGERS = {
  entersField: 'enters-field',
  leavesField: 'leaves-field',
  attacks: 'attacks',
  otherEntersField: 'other-enters-field',
  otherLeavesField: 'other-leaves-field',
  dealsDamageToOpponent: 'deals-damage-to-opponent',
  phase: 'phase',
  continuous: 'continuous',
} as const

export type EffectTriggerId = (typeof EFFECT_TRIGGERS)[keyof typeof EFFECT_TRIGGERS]