import type { Card, EffectPhase } from '@/types/card'

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
