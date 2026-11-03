import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import cards from '@/data/cards.json'
import type { CardInstance, PhaseId, PlayerState } from '@/types/game'

export const gamePhases = [
  { id: 'draw', label: 'Compra' },
  { id: 'main-one', label: 'Principal 1' },
  { id: 'combat', label: 'Combate' },
  { id: 'main-two', label: 'Principal 2' },
  { id: 'end', label: 'Fim do turno' },
] as const satisfies { id: PhaseId; label: string }[]

export const useGameStore = defineStore('game', () => {
  const players = ref<[PlayerState, PlayerState]>([
    createPlayer('Jogador 1'),
    createPlayer('Jogador 2'),
  ])
  const currentPlayerIndex = ref(0)
  const currentPhase = ref<PhaseId>('draw')
  const turnNumber = ref(1)
  const isDiscarding = ref(false)
  const message = ref('')
  let nextCardId = 0

  const currentPlayer = computed(() =>
    currentPlayerIndex.value === 0 ? players.value[0] : players.value[1],
  )
  const opponent = computed(() =>
    currentPlayerIndex.value === 0 ? players.value[1] : players.value[0],
  )
  const phaseIndex = computed(() => gamePhases.findIndex(({ id }) => id === currentPhase.value))
  const canPlayCards = computed(
    () => currentPhase.value === 'main-one' || currentPhase.value === 'main-two',
  )

  function createPlayer(name: string): PlayerState {
    return {
      name,
      deck: [],
      hand: [],
      field: [],
      graveyard: [],
      maxMana: 1,
      mana: 1,
      life: 30,
      hasTakenTurn: false,
    }
  }

  function createDeck(): CardInstance[] {
    const deck = cards.map((card) => ({ id: nextCardId++, card }))

    for (let index = deck.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      const currentCard = deck[index]
      const swapCard = deck[swapIndex]

      if (currentCard && swapCard) {
        deck[index] = swapCard
        deck[swapIndex] = currentCard
      }
    }

    return deck
  }

  function drawCards(player: PlayerState, amount: number) {
    for (let count = 0; count < amount; count += 1) {
      const card = player.deck.shift()

      if (!card) {
        message.value = `${player.name} não tem mais cartas no baralho.`
        return
      }

      player.hand.push(card)
    }
  }

  function startGame() {
    nextCardId = 0
    players.value = [
      {
        ...createPlayer('Jogador 1'),
        deck: createDeck(),
        hasTakenTurn: true,
      },
      {
        ...createPlayer('Jogador 2'),
        deck: createDeck(),
      },
    ]
    drawCards(players.value[0], 5)
    drawCards(players.value[1], 5)
    currentPlayerIndex.value = 0
    currentPhase.value = 'draw'
    turnNumber.value = 1
    isDiscarding.value = false
    message.value = ''
    drawCards(players.value[0], 1)
  }

  function canPlay(card: CardInstance) {
    return canPlayCards.value && currentPlayer.value.mana >= card.card.cost
  }

  function playCard(instance: CardInstance) {
    const player = currentPlayer.value
    const cardIndex = player.hand.findIndex(({ id }) => id === instance.id)

    if (cardIndex === -1 || !canPlay(instance)) {
      return false
    }

    player.mana -= instance.card.cost
    player.field.push(instance)
    player.hand.splice(cardIndex, 1)
    message.value = `${instance.card.name} entrou em campo.`
    return true
  }

  function discardCard(instance: CardInstance) {
    const player = currentPlayer.value
    const cardIndex = player.hand.findIndex(({ id }) => id === instance.id)

    if (!isDiscarding.value || cardIndex === -1 || player.hand.length <= 6) {
      return false
    }

    const [discardedCard] = player.hand.splice(cardIndex, 1)

    if (!discardedCard) {
      return false
    }

    player.graveyard.push(discardedCard)

    if (player.hand.length <= 6) {
      isDiscarding.value = false
      message.value = `${discardedCard.card.name} foi para o cemitério. Já pode encerrar o turno.`
      return true
    }

    message.value = `${discardedCard.card.name} foi para o cemitério. Descarte mais ${player.hand.length - 6}.`
    return true
  }

  function endTurn() {
    const player = currentPlayer.value

    if (player.hand.length > 6) {
      isDiscarding.value = true
      message.value = `Descarte ${player.hand.length - 6} carta(s) para o cemitério antes de encerrar o turno.`
      return
    }

    isDiscarding.value = false
    currentPlayerIndex.value = 1 - currentPlayerIndex.value
    turnNumber.value += 1
    currentPhase.value = 'draw'

    const nextPlayer = currentPlayer.value
    if (nextPlayer.hasTakenTurn) {
      nextPlayer.maxMana += 1
      nextPlayer.mana = nextPlayer.maxMana
    } else {
      nextPlayer.hasTakenTurn = true
    }
    message.value = `${nextPlayer.name} começou o turno com ${nextPlayer.maxMana} de mana.`
    drawCards(nextPlayer, 1)
  }

  function advancePhase() {
    if (currentPhase.value === 'end') {
      endTurn()
      return
    }

    const nextPhase = gamePhases[phaseIndex.value + 1]

    if (nextPhase) {
      currentPhase.value = nextPhase.id

      if (nextPhase.id === 'combat') {
        message.value = 'Fase de combate: as ações de ataque ainda não estão implementadas.'
      } else {
        message.value = ''
      }
      isDiscarding.value = false
    }
  }

  function isNextPhase(phase: PhaseId) {
    return gamePhases[phaseIndex.value + 1]?.id === phase
  }

  return {
    players,
    currentPlayerIndex,
    currentPhase,
    turnNumber,
    isDiscarding,
    message,
    currentPlayer,
    opponent,
    phaseIndex,
    canPlayCards,
    phases: gamePhases,
    startGame,
    canPlay,
    playCard,
    discardCard,
    endTurn,
    advancePhase,
    isNextPhase,
  }
})
