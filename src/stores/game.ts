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
  const combatStep = ref<'attack' | 'defense' | 'damage' | null>(null)
  const attackers = ref<number[]>([])
  const blockers = ref<Record<number, number>>({})
  const damageAssignments = ref<Record<number, Record<number, number>>>({})
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
    combatStep.value = null
    attackers.value = []
    blockers.value = {}
    damageAssignments.value = {}
    currentPhase.value = 'main-one'
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
    instance.summonedOnTurn = turnNumber.value
    instance.damage = 0
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
    currentPhase.value = 'main-one'
  }

  function isCreature(instance: CardInstance) {
    return instance.card.type.startsWith('Criatura')
  }

  function canAttackThisTurn(instance: CardInstance) {
    return isCreature(instance) && instance.summonedOnTurn !== turnNumber.value
  }

  function canAttack(instance: CardInstance) {
    return (
      currentPhase.value === 'combat' &&
      combatStep.value === 'attack' &&
      currentPlayer.value.field.some(({ id }) => id === instance.id) &&
      canAttackThisTurn(instance)
    )
  }

  function canBlock(instance: CardInstance) {
    return (
      currentPhase.value === 'combat' &&
      combatStep.value === 'defense' &&
      opponent.value.field.some(({ id }) => id === instance.id) &&
      isCreature(instance) &&
      !Object.hasOwn(blockers.value, instance.id)
    )
  }

  function toggleAttacker(instance: CardInstance) {
    if (!canAttack(instance)) {
      return false
    }

    attackers.value = attackers.value.includes(instance.id)
      ? attackers.value.filter((id) => id !== instance.id)
      : [...attackers.value, instance.id]
    return true
  }

  function declareAttack() {
    if (currentPhase.value !== 'combat' || combatStep.value !== 'attack' || !attackers.value.length) {
      return false
    }

    combatStep.value = 'defense'
    message.value = `${opponent.value.name}, declare seus bloqueadores.`
    return true
  }

  function assignBlocker(defenderId: number, attackerId: number) {
    const defender = opponent.value.field.find(({ id }) => id === defenderId)
    const attacker = currentPlayer.value.field.find(({ id }) => id === attackerId)
    if (
      !defender ||
      !attacker ||
      !canBlock(defender) ||
      !attackers.value.includes(attackerId)
    ) {
      return false
    }

    blockers.value[defenderId] = attackerId
    return true
  }

  function setCombatDamage(attackerId: number, defenderId: number, damage: number) {
    const attacker = currentPlayer.value.field.find(({ id }) => id === attackerId)
    const defender = opponent.value.field.find(({ id }) => id === defenderId)
    const assignedBlockers = Object.entries(blockers.value)
      .filter(([, blockedAttackerId]) => Number(blockedAttackerId) === attackerId)
      .map(([id]) => Number(id))
    const maxDamage = attacker?.card.attack ?? 0
    const otherAssignedDamage = Object.entries(damageAssignments.value[attackerId] ?? {})
      .filter(([id]) => Number(id) !== defenderId)
      .reduce((total, [, amount]) => total + amount, 0)

    if (
      currentPhase.value !== 'combat' ||
      combatStep.value !== 'damage' ||
      !attacker ||
      !defender ||
      !assignedBlockers.includes(defenderId) ||
      !Number.isInteger(damage) ||
      damage < 0 ||
      otherAssignedDamage + damage > maxDamage
    ) {
      return false
    }

    damageAssignments.value[attackerId] = {
      ...damageAssignments.value[attackerId],
      [defenderId]: damage,
    }
    return true
  }

  const canResolveCombat = computed(() => {
    if (combatStep.value === 'defense') {
      return currentPhase.value === 'combat'
    }

    if (currentPhase.value !== 'combat' || combatStep.value !== 'damage') {
      return false
    }

    return attackers.value.every((attackerId) => {
      const assignedBlockers = Object.entries(blockers.value)
        .filter(([, blockedAttackerId]) => Number(blockedAttackerId) === attackerId)
        .map(([id]) => Number(id))
      if (assignedBlockers.length <= 1) {
        return true
      }

      const totalDamage = Object.values(damageAssignments.value[attackerId] ?? {}).reduce(
        (total, amount) => total + amount,
        0,
      )
      const attacker = currentPlayer.value.field.find(({ id }) => id === attackerId)
      return totalDamage === (attacker?.card.attack ?? 0)
    })
  })

  function finishCombat() {
    const player = currentPlayer.value
    const defendingPlayer = opponent.value
    const damageByCard = new Map<number, number>()

    for (const attackerId of attackers.value) {
      const attacker = player.field.find(({ id }) => id === attackerId)
      if (!attacker) {
        continue
      }

      const assignedBlockers = Object.entries(blockers.value)
        .filter(([, blockedAttackerId]) => Number(blockedAttackerId) === attackerId)
        .map(([id]) => defendingPlayer.field.find(({ id: defenderId }) => defenderId === Number(id)))
        .filter((defender): defender is CardInstance => defender !== undefined)
      const attackDamage = attacker.card.attack ?? 0

      if (!assignedBlockers.length) {
        defendingPlayer.life -= attackDamage
        continue
      }

      for (const defender of assignedBlockers) {
        const damageToDefender =
          assignedBlockers.length === 1
            ? attackDamage
            : (damageAssignments.value[attackerId]?.[defender.id] ?? 0)
        damageByCard.set(
          defender.id,
          (damageByCard.get(defender.id) ?? 0) + damageToDefender,
        )
        damageByCard.set(
          attacker.id,
          (damageByCard.get(attacker.id) ?? 0) + (defender.card.attack ?? 0),
        )
      }
    }

    const defeated: string[] = []
    for (const [cardId, damage] of damageByCard) {
      const owner = player.field.some(({ id }) => id === cardId) ? player : defendingPlayer
      const cardIndex = owner.field.findIndex(({ id }) => id === cardId)
      const creature = owner.field[cardIndex]

      if (!creature) {
        continue
      }

      creature.damage = (creature.damage ?? 0) + damage
      if (creature.damage >= (creature.card.defense ?? 0)) {
        defeated.push(creature.card.name)
        owner.graveyard.push(creature)
        owner.field.splice(cardIndex, 1)
      }
    }

    currentPhase.value = 'main-two'
    combatStep.value = null
    attackers.value = []
    blockers.value = {}
    damageAssignments.value = {}
    isDiscarding.value = false
    message.value = defeated.length
      ? `Combate resolvido. Foram para o cemitério: ${defeated.join(', ')}.`
      : 'Combate resolvido.'
  }

  function declareDefenders() {
    if (currentPhase.value !== 'combat' || combatStep.value !== 'defense') {
      return false
    }

    const hasMultipleBlockers = attackers.value.some(
      (attackerId) =>
        Object.values(blockers.value).filter((blockedAttackerId) => blockedAttackerId === attackerId)
          .length > 1,
    )

    if (hasMultipleBlockers) {
      damageAssignments.value = {}
      for (const attackerId of attackers.value) {
        const defenderIds = Object.entries(blockers.value)
          .filter(([, blockedAttackerId]) => blockedAttackerId === attackerId)
          .map(([id]) => Number(id))
        if (defenderIds.length > 1) {
          damageAssignments.value[attackerId] = Object.fromEntries(
            defenderIds.map((defenderId) => [defenderId, 0]),
          )
        }
      }
      combatStep.value = 'damage'
      message.value = 'Distribua o dano de cada atacante entre seus defensores.'
      return true
    }

    finishCombat()
    return true
  }

  function resolveCombat() {
    if (
      currentPhase.value !== 'combat' ||
      combatStep.value !== 'damage' ||
      !canResolveCombat.value
    ) {
      return false
    }

    finishCombat()
    return true
  }

  function skipCombat() {
    if (
      currentPhase.value !== 'combat' ||
      combatStep.value !== 'attack' ||
      attackers.value.length
    ) {
      return false
    }

    currentPhase.value = 'main-two'
    combatStep.value = null
    blockers.value = {}
    damageAssignments.value = {}
    message.value = 'Combate encerrado sem ataques.'
    return true
  }

  function advancePhase() {
    if (currentPhase.value === 'end') {
      endTurn()
      return
    }

    const nextPhase = gamePhases[phaseIndex.value + 1]

    if (nextPhase) {
      if (
        nextPhase.id === 'combat' &&
        !currentPlayer.value.field.some(canAttackThisTurn)
      ) {
        goToPhase('main-two')
        message.value = 'Combate pulado: não há criaturas aptas a atacar.'
        return
      }

      goToPhase(nextPhase.id)
    }
  }

  function canNavigateToPhase(phase: PhaseId) {
    const targetIndex = gamePhases.findIndex(({ id }) => id === phase)
    if (currentPhase.value === 'draw') {
      return phase === 'main-one'
    }

    return targetIndex > phaseIndex.value
  }

  function goToPhase(phase: PhaseId) {
    if (!canNavigateToPhase(phase)) {
      return
    }

    const skippedCombat = currentPhase.value === 'combat'
    currentPhase.value = phase
    isDiscarding.value = false

    if (phase === 'combat') {
      combatStep.value = 'attack'
      attackers.value = []
      blockers.value = {}
      damageAssignments.value = {}
      message.value = 'Selecione as criaturas que atacarão o adversário.'
      return
    }

    if (skippedCombat) {
      combatStep.value = null
      attackers.value = []
      blockers.value = {}
      damageAssignments.value = {}
      message.value = 'Combate pulado.'
      return
    }

    message.value = ''
  }

  return {
    players,
    currentPlayerIndex,
    currentPhase,
    turnNumber,
    isDiscarding,
    message,
    combatStep,
    attackers,
    blockers,
    damageAssignments,
    canResolveCombat,
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
    canAttack,
    canBlock,
    toggleAttacker,
    declareAttack,
    assignBlocker,
    declareDefenders,
    setCombatDamage,
    resolveCombat,
    skipCombat,
    advancePhase,
    canNavigateToPhase,
    goToPhase,
  }
})
