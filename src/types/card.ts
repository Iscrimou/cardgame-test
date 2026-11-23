export type EffectPhase = 'draw' | 'main-one' | 'combat' | 'main-two' | 'end'

export type NumberFilter = number | { min?: number; max?: number }

export type CardTargetFilter = {
  controller?: 'you' | 'opponent' | 'any'
  zone?: 'field' | 'hand' | 'any'
  type?: string
  subtype?: string
  legendary?: boolean
  cost?: NumberFilter
  power?: NumberFilter
  resistance?: NumberFilter
}

export type EffectTarget = {
  filter: CardTargetFilter
  selection: 'source' | 'event' | 'one' | 'all' | 'up-to'
  maxTargets?: number
  players?: 'any'
}

export type CardEffectTrigger =
  | { type: 'enters-field' }
  | { type: 'leaves-field' }
  | { type: 'attacks'; filter?: CardTargetFilter }
  | { type: 'other-enters-field'; filter?: CardTargetFilter }
  | { type: 'other-leaves-field'; filter?: CardTargetFilter }
  | { type: 'deals-damage-to-opponent' }
  | {
      type: 'phase'
      phase: EffectPhase
      turn?: 'controller' | 'any'
      condition?: 'source-dealt-damage-to-player-this-turn'
    }
  | { type: 'continuous' }

export type CardEffectAction =
  | {
      type: 'modify'
      target: EffectTarget
      power?: number
      resistance?: number
      cost?: number
      duration?: 'permanent' | 'end-of-turn'
    }
  | { type: 'create-token'; card: Card; count?: number }
  | { type: 'create-token'; token: string; count?: number }
  | { type: 'destroy'; target: EffectTarget }
  | { type: 'damage'; target: EffectTarget; amount: number }
  | {
      type: 'add-counters'
      target: EffectTarget
      counter: '+1/+1' | '-1/-1'
      amount: number
    }

type ContinuousEffectAction = Omit<
  Extract<CardEffectAction, { type: 'modify' }>,
  'duration' | 'target'
> & {
  target: Omit<EffectTarget, 'selection' | 'maxTargets'> & { selection: 'source' | 'all' }
}

export type CardEffect =
  | {
      trigger: { type: 'continuous' }
      actions: ContinuousEffectAction[]
    }
  | {
      trigger: Exclude<CardEffectTrigger, { type: 'continuous' }>
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
