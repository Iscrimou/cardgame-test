import type { Card, CardEffect, EffectPhase } from '@/types/card'

export type CardStatModifier = {
  power: number
  resistance: number
  cost: number
  duration: 'permanent' | 'end-of-turn'
  expiresAtTurn?: number
  expiresForPlayer?: number
}

export type CardCounterType = '+1/+1' | '-1/-1'
export type CardCounters = Partial<Record<CardCounterType, number>>
export type CardCounterDisplay = { type: CardCounterType; count: number }

export type CardInstance = {
  id: number
  card: Card
  summonedOnTurn?: number
  damage?: number
  modifiers?: CardStatModifier[]
  counters?: CardCounters
}

export type FieldEvent =
  | { type: 'field'; transition: 'enters' | 'leaves'; instance: CardInstance; ownerIndex: number }
  | { type: 'attacks'; attackerIds: number[]; ownerIndex: number }
  | {
      type: 'damage-player'
      source: CardInstance
      sourceOwnerIndex: number
      targetOwnerIndex: number
      amount: number
    }
  | { type: 'phase'; phase: PhaseId; ownerIndex: number }

export type EffectResolution = {
  effect: CardEffect
  source: CardInstance
  sourceOwnerIndex: number
  event: FieldEvent
  actionIndex: number
}

export type OwnedCard = {
  instance: CardInstance
  ownerIndex: number
  zone: 'field' | 'hand'
}

export type PendingTarget = {
  sourceName: string
  candidates: OwnedCard[]
  playerCandidates: number[]
  selection: 'one' | 'up-to'
  maxTargets: number
  selectedInstanceIds: number[]
}

export type EffectiveStats = {
  cost: number
  power: number
  resistance: number
}

export type PlayerState = {
  name: string
  deck: CardInstance[]
  hand: CardInstance[]
  field: CardInstance[]
  graveyard: CardInstance[]
  maxMana: number
  mana: number
  life: number
  hasTakenTurn: boolean
}

export type PhaseId = EffectPhase
