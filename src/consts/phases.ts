export const PHASES = {
  draw: 'draw',
  mainOne: 'main-one',
  combat: 'combat',
  mainTwo: 'main-two',
  end: 'end',
} as const

export const phaseOrder = [
  { id: PHASES.draw, label: 'Compra' },
  { id: PHASES.mainOne, label: 'Principal 1' },
  { id: PHASES.combat, label: 'Combate' },
  { id: PHASES.mainTwo, label: 'Principal 2' },
  { id: PHASES.end, label: 'Fim do turno' },
] as const

export type EffectPhase = (typeof PHASES)[keyof typeof PHASES]