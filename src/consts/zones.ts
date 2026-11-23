export const ZONES = {
  field: 'field',
  hand: 'hand',
  any: 'any',
} as const

export type ZoneId = (typeof ZONES)[keyof typeof ZONES]
export type CardLocation = typeof ZONES.field | typeof ZONES.hand