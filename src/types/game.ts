import type { Card } from '@/types/card'

export type CardInstance = {
  id: number
  card: Card
}

export type PlayerState = {
  name: string
  deck: CardInstance[]
  hand: CardInstance[]
  field: CardInstance[]
  graveyard: CardInstance[]
  maxMana: number
  mana: number
  hasTakenTurn: boolean
}

export type PhaseId = 'draw' | 'main-one' | 'combat' | 'main-two' | 'end'
