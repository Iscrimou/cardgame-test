import { EFFECT_TRIGGERS } from '@/consts/effect-triggers'
import { EFFECT_ACTIONS } from '@/consts/effect-actions'
import type { EffectDuration } from '@/consts/effect-durations'
import {
  EFFECT_TARGET_SELECTIONS,
  type EffectTargetController,
  type EffectTargetSelection,
} from '@/consts/effect-targets'
import type { EffectPhase } from '@/consts/phases'
import type { ZoneId } from '@/consts/zones'

export type { EffectPhase } from '@/consts/phases'

export type NumberFilter = number | { min?: number; max?: number }

export type CardTargetFilter = {
  controller?: EffectTargetController
  zone?: ZoneId
  type?: string
  subtype?: string
  legendary?: boolean
  cost?: NumberFilter
  power?: NumberFilter
  resistance?: NumberFilter
}

export type EffectTarget = {
  filter: CardTargetFilter
  selection: EffectTargetSelection
  maxTargets?: number
  players?: 'any'
}

export type CardEffectTrigger =
  | { type: typeof EFFECT_TRIGGERS.entersField }
  | { type: typeof EFFECT_TRIGGERS.leavesField }
  | { type: typeof EFFECT_TRIGGERS.attacks; filter?: CardTargetFilter }
  | { type: typeof EFFECT_TRIGGERS.otherEntersField; filter?: CardTargetFilter }
  | { type: typeof EFFECT_TRIGGERS.otherLeavesField; filter?: CardTargetFilter }
  | { type: typeof EFFECT_TRIGGERS.dealsDamageToOpponent }
  | {
      type: typeof EFFECT_TRIGGERS.phase
      phase: EffectPhase
      turn?: 'controller' | 'any'
      condition?: 'source-dealt-damage-to-player-this-turn'
    }
  | { type: typeof EFFECT_TRIGGERS.continuous }

export type CardEffectAction =
  | {
      type: typeof EFFECT_ACTIONS.modify
      target: EffectTarget
      power?: number
      resistance?: number
      cost?: number
      duration?: EffectDuration
    }
  | { type: typeof EFFECT_ACTIONS.createToken; card: Card; count?: number }
  | { type: typeof EFFECT_ACTIONS.createToken; token: string; count?: number }
  | { type: typeof EFFECT_ACTIONS.destroy; target: EffectTarget }
  | { type: typeof EFFECT_ACTIONS.damage; target: EffectTarget; amount: number }
  | {
      type: typeof EFFECT_ACTIONS.addCounters
      target: EffectTarget
      counter: '+1/+1' | '-1/-1'
      amount: number
    }

type ContinuousEffectAction = Omit<
  Extract<CardEffectAction, { type: typeof EFFECT_ACTIONS.modify }>,
  'duration' | 'target'
> & {
  target: Omit<EffectTarget, 'selection' | 'maxTargets'> & {
    selection:
      | typeof EFFECT_TARGET_SELECTIONS.source
      | typeof EFFECT_TARGET_SELECTIONS.all
  }
}

export type CardEffect =
  | {
      trigger: { type: typeof EFFECT_TRIGGERS.continuous }
      actions: ContinuousEffectAction[]
    }
  | {
      trigger: Exclude<CardEffectTrigger, { type: typeof EFFECT_TRIGGERS.continuous }>
      actions: CardEffectAction[]
    }

export type Card = {
  name: string
  type: string
  subtype?: string
  cost?: number
  attack?: number
  defense?: number
  keywords: string[]
  effect: string
  inscription: string
  image: string
  rarity?: number
  effects?: CardEffect[]
}
