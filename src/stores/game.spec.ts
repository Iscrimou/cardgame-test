import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import cards from '@/data/cards'
import tokens from '@/data/tokens'
import type { Card, CardEffect } from '@/types/card'
import type { CardInstance } from '@/types/game'
import { useGameStore } from '@/stores/game'

const cardTemplate: Card = {
  name: 'Carta de teste',
  type: 'Criatura',
  subtype: 'Lobo',
  cost: 1,
  attack: 2,
  defense: 2,
  keywords: [],
  effect: '',
  inscription: '',
  image: 'Gemini_Generated_Image_ke8vrpke8vrpke8v.jpg',
  rarity: 0,
}

function makeCard(overrides: Partial<Card> = {}): Card {
  return { ...cardTemplate, ...overrides }
}

function makeInstance(id: number, card: Card): CardInstance {
  return { id, card, damage: 0 }
}

function createGame() {
  const game = useGameStore()
  game.startGame()
  game.players[0].field = []
  game.players[0].hand = []
  game.players[1].field = []
  game.players[1].hand = []
  game.players[0].mana = 20
  game.currentPlayerIndex = 0
  game.currentPhase = 'main-one'
  return game
}

describe('efeitos de cartas', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mantém fichas fora das cartas normais e dos baralhos iniciais', () => {
    const game = useGameStore()
    game.startGame()

    expect(tokens.some(({ name }) => name === 'LOBO')).toBe(true)
    expect(cards.every(({ type }) => !type.startsWith('Criatura Token'))).toBe(true)
    expect(
      game.players
        .flatMap((player) => [...player.deck, ...player.hand])
        .every(({ card }) => !card.type.startsWith('Criatura Token')),
    ).toBe(true)
  })

  it('causa dano ao jogador escolhido quando o Lobo Sangrento entra em campo', () => {
    const game = createGame()
    const bloodyWolf = cards.find(({ name }) => name === 'LOBO SANGRENTO CAMINHANTE')
    if (!bloodyWolf) {
      throw new Error('Carta de teste Lobo Sangrento Caminhante ausente.')
    }

    const source = makeInstance(120, bloodyWolf)
    game.players[0].hand.push(source)

    expect(game.playCard(source)).toBe(true)
    expect(game.pendingEffectTarget?.playerCandidates).toEqual([0, 1])
    expect(game.players[1].life).toBe(30)
    expect(game.chooseEffectPlayerTarget(1)).toBe(true)
    expect(game.players[1].life).toBe(28)
    expect(game.pendingEffectTarget).toBeNull()
  })

  it('aplica o dano do Lobo Sangrento à criatura alvo', () => {
    const game = createGame()
    const bloodyWolf = cards.find(({ name }) => name === 'LOBO SANGRENTO CAMINHANTE')
    if (!bloodyWolf) {
      throw new Error('Carta de teste Lobo Sangrento Caminhante ausente.')
    }

    const source = makeInstance(121, bloodyWolf)
    const target = makeInstance(122, makeCard({ name: 'Alvo', defense: 4 }))
    game.players[0].hand.push(source)
    game.players[1].field.push(target)

    expect(game.playCard(source)).toBe(true)
    expect(game.chooseEffectTarget(target.id)).toBe(true)
    expect(target.damage).toBe(2)
    expect(game.players[1].field.some(({ id }) => id === target.id)).toBe(true)
  })

  it('permite à Sombra da Lua escolher até duas criaturas para contadores -1/-1', () => {
    const game = createGame()
    const moonShadow = cards.find(({ name }) => name === 'SOMBRA DA LUA')
    if (!moonShadow) {
      throw new Error('Carta de teste Sombra da Lua ausente.')
    }

    const source = makeInstance(125, moonShadow)
    const firstTarget = makeInstance(126, makeCard({ name: 'Alvo 1', attack: 3, defense: 4 }))
    const secondTarget = makeInstance(127, makeCard({ name: 'Alvo 2', attack: 2, defense: 3 }))
    const thirdTarget = makeInstance(128, makeCard({ name: 'Alvo 3', attack: 4, defense: 4 }))
    game.players[0].hand.push(source)
    game.players[1].field.push(firstTarget, secondTarget, thirdTarget)

    expect(game.playCard(source)).toBe(true)
    expect(game.pendingEffectTarget?.selection).toBe('up-to')
    expect(game.pendingEffectTarget?.maxTargets).toBe(2)
    expect(game.pendingEffectTarget?.candidates.map(({ instance }) => instance.id)).toEqual([
      source.id,
      firstTarget.id,
      secondTarget.id,
      thirdTarget.id,
    ])
    expect(game.toggleEffectTarget(firstTarget.id)).toBe(true)
    expect(game.toggleEffectTarget(secondTarget.id)).toBe(true)
    expect(game.toggleEffectTarget(thirdTarget.id)).toBe(false)
    expect(firstTarget.counters).toBeUndefined()

    expect(game.confirmEffectTargets()).toBe(true)
    expect(firstTarget.counters?.['-1/-1']).toBe(1)
    expect(secondTarget.counters?.['-1/-1']).toBe(1)
    expect(thirdTarget.counters).toBeUndefined()
    expect(game.getEffectiveStats(firstTarget)).toMatchObject({ power: 2, resistance: 3 })
    expect(game.getEffectiveStats(secondTarget)).toMatchObject({ power: 1, resistance: 2 })
    expect(game.pendingEffectTarget).toBeNull()
  })

  it('permite recusar a escolha opcional da Sombra da Lua', () => {
    const game = createGame()
    const moonShadow = cards.find(({ name }) => name === 'SOMBRA DA LUA')
    if (!moonShadow) {
      throw new Error('Carta de teste Sombra da Lua ausente.')
    }

    const source = makeInstance(129, moonShadow)
    const target = makeInstance(130, makeCard({ name: 'Alvo', attack: 3, defense: 3 }))
    game.players[0].hand.push(source)
    game.players[1].field.push(target)

    expect(game.playCard(source)).toBe(true)
    expect(game.confirmEffectTargets(true)).toBe(true)
    expect(target.counters).toBeUndefined()
    expect(game.pendingEffectTarget).toBeNull()
  })

  it('destrói criaturas cuja resistência chega a zero após receber o contador', () => {
    const game = createGame()
    const moonShadow = cards.find(({ name }) => name === 'SOMBRA DA LUA')
    if (!moonShadow) {
      throw new Error('Carta de teste Sombra da Lua ausente.')
    }

    const source = makeInstance(131, moonShadow)
    const fragileTarget = makeInstance(
      132,
      makeCard({ name: 'Alvo frágil', attack: 1, defense: 1 }),
    )
    game.players[0].hand.push(source)
    game.players[1].field.push(fragileTarget)

    expect(game.playCard(source)).toBe(true)
    expect(game.toggleEffectTarget(fragileTarget.id)).toBe(true)
    expect(game.confirmEffectTargets()).toBe(true)
    expect(game.players[1].field.some(({ id }) => id === fragileTarget.id)).toBe(false)
    expect(game.players[1].graveyard.some(({ id }) => id === fragileTarget.id)).toBe(true)
  })

  it('aplica e expira o bônus condicional da Presa de Prata', () => {
    const game = createGame()
    const silverFang = cards.find(({ name }) => name === 'PRESA DE PRATA')
    if (!silverFang) {
      throw new Error('Carta de teste Presa de Prata ausente.')
    }

    const source = makeInstance(100, silverFang)
    const cheapWolf = makeInstance(111, makeCard({ name: 'Lobo barato', cost: 3 }))
    const enteringWolf = makeInstance(101, makeCard({ name: 'Lobo de custo alto', cost: 4 }))
    game.players[0].field.push(source)
    game.players[0].hand.push(cheapWolf, enteringWolf)

    expect(game.playCard(cheapWolf)).toBe(true)
    expect(game.getEffectiveStats(source).power).toBe(2)

    expect(game.playCard(enteringWolf)).toBe(true)
    expect(game.getEffectiveStats(source).power).toBe(4)

    game.endTurn()
    expect(game.getEffectiveStats(source).power).toBe(2)
  })

  it('recalcula efeitos contínuos e respeita o controlador do alvo', () => {
    const game = createGame()
    const continuousEffect: CardEffect = {
      trigger: { type: 'continuous' },
      actions: [
        {
          type: 'modify',
          target: {
            selection: 'all',
            filter: {
              controller: 'you',
              type: 'Criatura',
              subtype: 'Lobo',
              cost: 1,
              power: 2,
              resistance: 2,
            },
          },
          power: 1,
          resistance: 1,
        },
      ],
    }
    const aura = makeInstance(
      102,
      makeCard({ name: 'Aura', type: 'Encantamento', effects: [continuousEffect] }),
    )
    const friendlyWolf = makeInstance(103, makeCard())
    const enemyWolf = makeInstance(104, makeCard())
    game.players[0].field.push(aura, friendlyWolf)
    game.players[1].field.push(enemyWolf)

    expect(game.getEffectiveStats(friendlyWolf)).toMatchObject({ power: 3, resistance: 3 })
    expect(game.getEffectiveStats(enemyWolf)).toMatchObject({ power: 2, resistance: 2 })
  })

  it('inclui contadores +1/+1 e -1/-1 nos atributos efetivos', () => {
    const game = createGame()
    const creature = makeInstance(123, makeCard({ attack: 3, defense: 4 }))
    creature.counters = { '+1/+1': 2, '-1/-1': 1 }
    game.players[0].field.push(creature)

    expect(game.getEffectiveStats(creature)).toMatchObject({ power: 4, resistance: 5 })
  })

  it('trata ficha sem custo como custo efetivo zero', () => {
    const game = createGame()
    const tokenCard = tokens.find(({ type }) => type === 'Criatura Token')
    if (!tokenCard) {
      throw new Error('Carta de teste de criatura token ausente.')
    }

    const token = makeInstance(124, tokenCard)
    game.players[0].field.push(token)

    expect(game.getEffectiveStats(token)).toMatchObject({ cost: 0, power: 2, resistance: 2 })
  })

  it('aplica reduções de custo a cartas na mão e usa o custo efetivo ao jogar', () => {
    const game = createGame()
    const costEffect: CardEffect = {
      trigger: { type: 'phase', phase: 'main-two' },
      actions: [
        {
          type: 'modify',
          target: {
            selection: 'all',
            filter: { controller: 'you', zone: 'hand', type: 'Encantamento', cost: 3 },
          },
          cost: -2,
        },
      ],
    }
    const source = makeInstance(
      115,
      makeCard({ name: 'Redutor', type: 'Encantamento', effects: [costEffect] }),
    )
    const spell = makeInstance(
      116,
      makeCard({ name: 'Encantamento caro', type: 'Encantamento', cost: 3 }),
    )
    game.players[0].field.push(source)
    game.players[0].hand.push(spell)
    game.players[0].mana = 1

    game.goToPhase('main-two')

    expect(game.getEffectiveStats(spell).cost).toBe(1)
    expect(game.canPlay(spell)).toBe(true)
  })

  it('aguarda a escolha quando um efeito de destruição tem múltiplos alvos', () => {
    const game = createGame()
    const destroyOnEntry: CardEffect = {
      trigger: { type: 'other-enters-field', filter: { controller: 'you', type: 'Criatura' } },
      actions: [
        {
          type: 'destroy',
          target: {
            selection: 'one',
            filter: { controller: 'opponent', type: 'Criatura' },
          },
        },
      ],
    }
    const watcher = makeInstance(105, makeCard({ name: 'Observador', effects: [destroyOnEntry] }))
    const firstTarget = makeInstance(106, makeCard({ name: 'Alvo 1' }))
    const secondTarget = makeInstance(107, makeCard({ name: 'Alvo 2' }))
    const entrant = makeInstance(108, makeCard({ name: 'Nova criatura' }))
    game.players[0].field.push(watcher)
    game.players[0].hand.push(entrant)
    game.players[1].field.push(firstTarget, secondTarget)

    expect(game.playCard(entrant)).toBe(true)
    expect(game.pendingEffectTarget?.candidates).toHaveLength(2)
    expect(game.chooseEffectTarget(firstTarget.id)).toBe(true)
    expect(game.players[1].field.map(({ id }) => id)).toEqual([secondTarget.id])
    expect(game.players[1].graveyard.map(({ id }) => id)).toContain(firstTarget.id)
  })

  it('cria a quantidade de fichas configurada ao entrar em campo', () => {
    const game = createGame()
    const token = makeCard({ name: 'Ficha de Lobo', cost: 0 })
    const createTokenOnEntry: CardEffect = {
      trigger: { type: 'enters-field' },
      actions: [{ type: 'create-token', card: token, count: 2 }],
    }
    const source = makeInstance(
      109,
      makeCard({ name: 'Criador de fichas', effects: [createTokenOnEntry] }),
    )
    game.players[0].hand.push(source)

    expect(game.playCard(source)).toBe(true)
    expect(game.players[0].field.filter(({ card }) => card.name === token.name)).toHaveLength(2)
  })

  it('dispara efeitos de saída quando uma ação destrói outra carta', () => {
    const game = createGame()
    const token = makeCard({ name: 'Ficha de vingança', cost: 0 })
    const watcherEffect: CardEffect = {
      trigger: {
        type: 'other-leaves-field',
        filter: { controller: 'opponent', subtype: 'Lobo' },
      },
      actions: [{ type: 'create-token', card: token }],
    }
    const destructionEffect: CardEffect = {
      trigger: { type: 'enters-field' },
      actions: [
        {
          type: 'destroy',
          target: {
            selection: 'one',
            filter: { controller: 'opponent', subtype: 'Lobo' },
          },
        },
      ],
    }
    const watcher = makeInstance(112, makeCard({ name: 'Vingador', effects: [watcherEffect] }))
    const target = makeInstance(113, makeCard({ name: 'Lobo inimigo' }))
    const destroyer = makeInstance(
      114,
      makeCard({ name: 'Destruidor', effects: [destructionEffect] }),
    )
    game.players[0].field.push(watcher)
    game.players[0].hand.push(destroyer)
    game.players[1].field.push(target)

    expect(game.playCard(destroyer)).toBe(true)
    expect(game.players[1].graveyard.map(({ id }) => id)).toContain(target.id)
    expect(game.players[0].field.filter(({ card }) => card.name === token.name)).toHaveLength(1)
  })

  it('executa efeitos ao entrar em uma fase pelo controlador da carta', () => {
    const game = createGame()
    const endPhaseEffect: CardEffect = {
      trigger: { type: 'phase', phase: 'end' },
      actions: [
        {
          type: 'modify',
          target: { selection: 'source', filter: {} },
          power: 1,
          duration: 'end-of-turn',
        },
      ],
    }
    const source = makeInstance(
      110,
      makeCard({ name: 'Vigia do turno', effects: [endPhaseEffect] }),
    )
    game.players[0].field.push(source)

    game.goToPhase('end')
    expect(game.getEffectiveStats(source).power).toBe(3)
  })
})
