export type Card = {
  name: string
  type: string
  subtype?: string
  cost: number
  attack?: number
  defense?: number
  keywords: string[]
  effect: string
  inscription: string
  image: string
  rarity: number
}
