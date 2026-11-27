import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { EFFECT_ACTIONS } from '@/consts/effect-actions'
import { EFFECT_TRIGGERS } from '@/consts/effect-triggers'
import { EFFECT_TARGET_CONTROLLERS, EFFECT_TARGET_SELECTIONS } from '@/consts/effect-targets'
import { EFFECT_DURATIONS } from '@/consts/effect-durations'
import { PHASES, phaseOrder } from '@/consts/phases'
import { ZONES, type ZoneId } from '@/consts/zones'
import cards from '@/data/cards'
import tokens from '@/data/tokens'
import type {
  CardEffect,
  CardEffectAction,
  CardTargetFilter,
  EffectTarget,
  NumberFilter,
} from '@/types/card'
import type {
  CardInstance,
  CardStatModifier,
  EffectResolution,
  EffectiveStats,
  FieldEvent,
  OwnedCard,
  PendingTarget,
  PhaseId,
  PlayerState,
} from '@/types/game'

export const gamePhases = phaseOrder

const maxEffectActionsPerResolution = 1000
const maxTokensPerEffect = 100

export const useGameStore = defineStore('game', () => {
  const players = ref<[PlayerState, PlayerState]>([
    createPlayer('Jogador 1'),
    createPlayer('Jogador 2'),
  ])
  const currentPlayerIndex = ref(0)
  const currentPhase = ref<PhaseId>(PHASES.draw)
  const turnNumber = ref(1)
  const isDiscarding = ref(false)
  const message = ref('')
  const combatStep = ref<'attack' | 'defense' | 'damage' | null>(null)
  const attackers = ref<number[]>([])
  const blockers = ref<Record<number, number>>({})
  const damageAssignments = ref<Record<number, Record<number, number>>>({})
  const pendingEffectTarget = ref<PendingTarget | null>(null)
  const effectQueue: EffectResolution[] = []
  const instancesThatDamagedPlayersThisTurn = new Set<number>()
  let resolvingEffects = false
  let checkingStateBasedActions = false
  let pendingTurnStart = false
  let nextCardId = 0

  const currentPlayer = computed(() =>
    currentPlayerIndex.value === 0 ? players.value[0] : players.value[1],
  )
  const opponent = computed(() =>
    currentPlayerIndex.value === 0 ? players.value[1] : players.value[0],
  )
  const phaseIndex = computed(() => gamePhases.findIndex(({ id }) => id === currentPhase.value))
  const canPlayCards = computed(
    () => currentPhase.value === PHASES.mainOne || currentPhase.value === PHASES.mainTwo,
  )

  function createPlayer(name: string): PlayerState {
    return {
      name,
      deck: [],
      hand: [],
      field: [],
      graveyard: [],
      maxMana: 1,
      mana: 10,
      life: 30,
      hasTakenTurn: false,
    }
  }

  // Reset the game state to its initial values
  function resetGame(): void {
    currentPlayerIndex.value = 0
    currentPhase.value = PHASES.draw
    turnNumber.value = 1
    isDiscarding.value = false
    message.value = ''
    combatStep.value = null
    attackers.value = []
    blockers.value = {}
    damageAssignments.value = {}
    pendingEffectTarget.value = null
    effectQueue.length = 0
    instancesThatDamagedPlayersThisTurn.clear()
    pendingTurnStart = false
    currentPhase.value = PHASES.mainOne
  }

  function getOwnedCards(zone: ZoneId = ZONES.any): OwnedCard[] {
    return players.value.flatMap((player, ownerIndex) => [
      ...(zone === ZONES.hand
        ? []
        : player.field.map((instance) => ({ instance, ownerIndex, zone: ZONES.field }))),
      ...(zone === ZONES.field
        ? []
        : player.hand.map((instance) => ({ instance, ownerIndex, zone: ZONES.hand }))),
    ])
  }

  function getBaseStats(instance: CardInstance): EffectiveStats {
    const modifiers = instance.modifiers ?? []
    const powerCounterModifier =
      (instance.counters?.['+1/+1'] ?? 0) - (instance.counters?.['-1/-1'] ?? 0)
    return {
      cost: Math.max(
        0,
        (instance.card.cost ?? 0) + modifiers.reduce((sum, item) => sum + item.cost, 0),
      ),
      power: Math.max(
        0,
        (instance.card.attack ?? 0) +
          modifiers.reduce((sum, item) => sum + item.power, 0) +
          powerCounterModifier,
      ),
      resistance: Math.max(
        0,
        (instance.card.defense ?? 0) +
          modifiers.reduce((sum, item) => sum + item.resistance, 0) +
          powerCounterModifier,
      ),
    }
  }

  function matchesNumber(value: number, filter: NumberFilter) {
    if (typeof filter === 'number') {
      return value === filter
    }

    return (
      (filter.min === undefined || value >= filter.min) &&
      (filter.max === undefined || value <= filter.max)
    )
  }

  function matchesTargetFilter(
    target: OwnedCard,
    sourceOwnerIndex: number,
    filter: CardTargetFilter,
    currentStats?: EffectiveStats,
  ) {
    const zone = filter.zone ?? ZONES.field
    if (zone !== ZONES.any && target.zone !== zone) {
      return false
    }

    if (
      (filter.controller === EFFECT_TARGET_CONTROLLERS.you &&
        target.ownerIndex !== sourceOwnerIndex) ||
      (filter.controller === EFFECT_TARGET_CONTROLLERS.opponent &&
        target.ownerIndex === sourceOwnerIndex)
    ) {
      return false
    }

    const card = target.instance.card
    if (filter.type && !card.type.startsWith(filter.type)) {
      return false
    }

    if (
      filter.legendary !== undefined &&
      card.type.toLowerCase().includes('lendári') !== filter.legendary
    ) {
      return false
    }

    if (filter.subtype && !card.subtype?.split(/[\s,]+/).includes(filter.subtype)) {
      return false
    }

    const stats = currentStats ?? getEffectiveStats(target.instance)
    return (
      (filter.cost === undefined ||
        (card.cost !== undefined && matchesNumber(card.cost, filter.cost))) &&
      (filter.power === undefined || matchesNumber(stats.power, filter.power)) &&
      (filter.resistance === undefined || matchesNumber(stats.resistance, filter.resistance))
    )
  }

  function getEffectiveStats(instance: CardInstance): EffectiveStats {
    const stats = getBaseStats(instance)
    const target = getOwnedCards().find(({ instance: candidate }) => candidate.id === instance.id)

    if (!target) {
      return stats
    }

    for (const source of getOwnedCards('field')) {
      for (const effect of source.instance.card.effects ?? []) {
        if (effect.trigger.type !== EFFECT_TRIGGERS.continuous) {
          continue
        }

        for (const action of effect.actions) {
          if (action.type !== EFFECT_ACTIONS.modify) {
            continue
          }

          const appliesToSource =
            action.target.selection === EFFECT_TARGET_SELECTIONS.source &&
            source.instance.id === instance.id &&
            matchesTargetFilter(target, source.ownerIndex, action.target.filter, stats)
          const appliesToAll =
            action.target.selection === EFFECT_TARGET_SELECTIONS.all &&
            matchesTargetFilter(target, source.ownerIndex, action.target.filter, stats)

          if (appliesToSource || appliesToAll) {
            stats.cost += action.cost ?? 0
            stats.power += action.power ?? 0
            stats.resistance += action.resistance ?? 0
          }
        }
      }
    }

    stats.cost = Math.max(0, stats.cost)
    stats.power = Math.max(0, stats.power)
    stats.resistance = Math.max(0, stats.resistance)
    return stats
  }

  function getActionTargets(
    target: EffectTarget,
    resolution: EffectResolution,
    fieldOnly = false,
  ): OwnedCard[] {
    if (
      fieldOnly &&
      target.filter.zone &&
      target.filter.zone !== ZONES.field &&
      target.filter.zone !== ZONES.any
    ) {
      return []
    }

    const zone = fieldOnly ? ZONES.field : (target.filter.zone ?? ZONES.field)
    const candidates = getOwnedCards(zone).filter((candidate) =>
      matchesTargetFilter(candidate, resolution.sourceOwnerIndex, target.filter),
    )

    if (target.selection === EFFECT_TARGET_SELECTIONS.source) {
      return candidates.filter(({ instance }) => instance.id === resolution.source.id)
    }

    if (target.selection === EFFECT_TARGET_SELECTIONS.event) {
      const event = resolution.event
      return event.type === 'field'
        ? candidates.filter(({ instance }) => instance.id === event.instance.id)
        : []
    }

    return candidates
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

  function triggerMatches(effect: CardEffect, event: FieldEvent, source: OwnedCard) {
    const trigger = effect.trigger
    if (trigger.type === EFFECT_TRIGGERS.continuous) {
      return false
    }

    if (trigger.type === EFFECT_TRIGGERS.attacks) {
      if (event.type !== 'attacks' || event.ownerIndex !== source.ownerIndex) {
        return false
      }
      if (!event.attackerIds.includes(source.instance.id)) {
        return false
      }

      const otherAttacker = getOwnedCards('field').find(
        ({ instance, ownerIndex }) =>
          ownerIndex === source.ownerIndex &&
          instance.id !== source.instance.id &&
          event.attackerIds.includes(instance.id) &&
          (!trigger.filter ||
            matchesTargetFilter(
              { instance, ownerIndex, zone: ZONES.field },
              source.ownerIndex,
              trigger.filter,
            )),
      )
      return otherAttacker !== undefined
    }

    if (trigger.type === EFFECT_TRIGGERS.dealsDamageToOpponent) {
      return (
        event.type === 'damage-player' &&
        event.amount > 0 &&
        event.source.id === source.instance.id &&
        event.sourceOwnerIndex === source.ownerIndex &&
        event.targetOwnerIndex !== event.sourceOwnerIndex
      )
    }

    if (trigger.type === EFFECT_TRIGGERS.phase) {
      return (
        event.type === 'phase' &&
        trigger.phase === event.phase &&
        (trigger.turn === 'any' || source.ownerIndex === event.ownerIndex) &&
        (trigger.condition !== 'source-dealt-damage-to-player-this-turn' ||
          instancesThatDamagedPlayersThisTurn.has(source.instance.id))
      )
    }

    if (event.type !== 'field') {
      return false
    }

    const isSourceEvent = source.instance.id === event.instance.id
    if (trigger.type === EFFECT_TRIGGERS.entersField) {
      return event.transition === 'enters' && isSourceEvent
    }

    if (trigger.type === EFFECT_TRIGGERS.leavesField) {
      return event.transition === 'leaves' && isSourceEvent
    }

    const entering = trigger.type === EFFECT_TRIGGERS.otherEntersField
    if (
      (entering && event.transition !== 'enters') ||
      (!entering && event.transition !== 'leaves') ||
      isSourceEvent
    ) {
      return false
    }

    return (
      !trigger.filter ||
      matchesTargetFilter(
        { instance: event.instance, ownerIndex: event.ownerIndex, zone: ZONES.field },
        source.ownerIndex,
        trigger.filter,
      )
    )
  }

  function queueEffectEvent(event: FieldEvent) {
    if (event.type === 'damage-player' && event.amount > 0) {
      instancesThatDamagedPlayersThisTurn.add(event.source.id)
    }

    for (const source of getOwnedCards('field')) {
      for (const effect of source.instance.card.effects ?? []) {
        if (triggerMatches(effect, event, source)) {
          effectQueue.push({
            effect,
            source: source.instance,
            sourceOwnerIndex: source.ownerIndex,
            event,
            actionIndex: 0,
          })
        }
      }
    }
  }

  function removeFromField(ownerIndex: number, instance: CardInstance) {
    const owner = players.value[ownerIndex]
    const cardIndex = owner?.field.findIndex(({ id }) => id === instance.id) ?? -1
    if (!owner || cardIndex < 0) {
      return
    }

    queueEffectEvent({ type: 'field', transition: 'leaves', instance, ownerIndex })
    owner.field.splice(cardIndex, 1)
    owner.graveyard.push(instance)
  }

  function applyEffectAction(
    action: CardEffectAction,
    targets: OwnedCard[],
    resolution: EffectResolution,
    targetPlayerIndex?: number,
  ) {
    if (action.type === EFFECT_ACTIONS.createToken) {
      const count = action.count ?? 1
      if (!Number.isInteger(count) || count < 1 || count > maxTokensPerEffect) {
        throw new Error(
          `Quantidade de fichas inválida no efeito de ${resolution.source.card.name}; o limite é ${maxTokensPerEffect}.`,
        )
      }

      const owner = players.value[resolution.sourceOwnerIndex]
      if (!owner) {
        throw new Error(
          `Dono inválido para ficha criada pelo efeito de ${resolution.source.card.name}.`,
        )
      }

      const tokenCard =
        'card' in action
          ? action.card
          : tokens.find(({ name }) => name === action.token)
      if (!tokenCard) {
        throw new Error(
          `Ficha não encontrada no catálogo: ${'token' in action ? action.token : ''}.`,
        )
      }

      for (let index = 0; index < count; index += 1) {
        const token: CardInstance = {
          id: nextCardId++,
          card: tokenCard,
          summonedOnTurn: turnNumber.value,
          damage: 0,
        }
        owner.field.push(token)
        queueEffectEvent({
          type: 'field',
          transition: 'enters',
          instance: token,
          ownerIndex: resolution.sourceOwnerIndex,
        })
      }
      message.value = `${resolution.source.card.name} criou ${count} ficha(s).`
      return
    }

    if (action.type === EFFECT_ACTIONS.addCounters) {
      if (!Number.isInteger(action.amount) || action.amount < 1) {
        throw new Error(
          `Quantidade de contadores inválida no efeito de ${resolution.source.card.name}.`,
        )
      }

      const affectedNames: string[] = []
      for (const { instance } of targets) {
        const counters = instance.counters ?? {}
        instance.counters = {
          ...counters,
          [action.counter]: (counters[action.counter] ?? 0) + action.amount,
        }
        affectedNames.push(instance.card.name)
      }

      if (affectedNames.length) {
        message.value = `${resolution.source.card.name} colocou ${action.amount} contador(es) ${action.counter} em: ${affectedNames.join('; ')}.`
      } else {
        message.value = `${resolution.source.card.name} não colocou contadores.`
      }

      checkStateBasedActions()
      return
    }

    if (action.type === EFFECT_ACTIONS.damage) {
      if (targetPlayerIndex !== undefined) {
        const targetPlayer = players.value[targetPlayerIndex]
        if (!targetPlayer) {
          throw new Error(`Dono inválido para alvo do efeito de ${resolution.source.card.name}.`)
        }
        targetPlayer.life -= action.amount
        message.value = `${resolution.source.card.name} causou ${action.amount} de dano a ${targetPlayer.name}.`
        if (action.amount > 0) {
          queueEffectEvent({
            type: 'damage-player',
            source: resolution.source,
            sourceOwnerIndex: resolution.sourceOwnerIndex,
            targetOwnerIndex: targetPlayerIndex,
            amount: action.amount,
          })
        }
      } else {
        for (const { instance } of targets) {
          instance.damage = (instance.damage ?? 0) + action.amount
        }
        if (targets.length) {
          message.value = `${resolution.source.card.name} causou ${action.amount} de dano a ${targets[0]?.instance.card.name}.`
        }
      }

      checkStateBasedActions()
      return
    }

    const affectedNames: string[] = []
    for (const target of targets) {
      if (action.type === EFFECT_ACTIONS.modify) {
        const modifier: CardStatModifier = {
          power: action.power ?? 0,
          resistance: action.resistance ?? 0,
          cost: action.cost ?? 0,
          duration: action.duration ?? EFFECT_DURATIONS.permanent,
        }
        if (modifier.duration === EFFECT_DURATIONS.endOfTurn) {
          modifier.expiresAtTurn = turnNumber.value
          modifier.expiresForPlayer = currentPlayerIndex.value
        }
        target.instance.modifiers = [...(target.instance.modifiers ?? []), modifier]
        affectedNames.push(target.instance.card.name)
      } else if (target.zone === ZONES.field) {
        removeFromField(target.ownerIndex, target.instance)
        affectedNames.push(target.instance.card.name)
      }
    }

    if (affectedNames.length && action.type === EFFECT_ACTIONS.modify) {
      message.value = `${resolution.source.card.name} modificou: ${affectedNames.join(', ')}.`
    } else if (affectedNames.length && action.type === EFFECT_ACTIONS.destroy) {
      message.value = `${resolution.source.card.name} destruiu: ${affectedNames.join(', ')}.`
    }

    checkStateBasedActions()
  }

  function resolveEffectQueue() {
    if (resolvingEffects || pendingEffectTarget.value) {
      return
    }

    resolvingEffects = true
    let resolvedActions = 0
    try {
      while (effectQueue.length && !pendingEffectTarget.value) {
        const resolution = effectQueue[0]
        if (!resolution) {
          break
        }

        const action = resolution.effect.actions[resolution.actionIndex]
        if (!action) {
          effectQueue.shift()
          continue
        }

        resolvedActions += 1
        if (resolvedActions > maxEffectActionsPerResolution) {
          throw new Error(
            `Resolução de efeitos excedeu ${maxEffectActionsPerResolution} ações; verifique ciclos nos efeitos de cartas.`,
          )
        }

        if (action.type === EFFECT_ACTIONS.createToken) {
          applyEffectAction(action, [], resolution)
          resolution.actionIndex += 1
          continue
        }

        const targets = getActionTargets(
          action.target,
          resolution,
          action.type === EFFECT_ACTIONS.destroy,
        )
        const playerCandidates =
          action.type === EFFECT_ACTIONS.damage && action.target.players === EFFECT_TARGET_CONTROLLERS.any
            ? players.value.map((_, ownerIndex) => ownerIndex)
            : []
        if (action.target.selection === EFFECT_TARGET_SELECTIONS.upTo) {
          if (
            action.type !== EFFECT_ACTIONS.addCounters &&
            action.type !== EFFECT_ACTIONS.destroy
          ) {
            throw new Error(
              `Seleção de até N alvos não suportada para o efeito de ${resolution.source.card.name}.`,
            )
          }

          const maxTargets = action.target.maxTargets
          if (typeof maxTargets !== 'number' || !Number.isInteger(maxTargets) || maxTargets < 1) {
            throw new Error(`Limite de alvos inválido no efeito de ${resolution.source.card.name}.`)
          }

          if (targets.length) {
            pendingEffectTarget.value = {
              sourceName: resolution.source.card.name,
              candidates: targets,
              playerCandidates: [],
              selection: EFFECT_TARGET_SELECTIONS.upTo,
              maxTargets,
              selectedInstanceIds: [],
            }
            message.value = `${resolution.source.card.name}: escolha até ${maxTargets} alvo(s) para o efeito.`
            break
          }

          applyEffectAction(action, [], resolution)
          resolution.actionIndex += 1
          continue
        }

        if (
          action.target.selection === EFFECT_TARGET_SELECTIONS.one &&
          targets.length + playerCandidates.length > 1
        ) {
          pendingEffectTarget.value = {
            sourceName: resolution.source.card.name,
            candidates: targets,
            playerCandidates,
            selection: EFFECT_TARGET_SELECTIONS.one,
            maxTargets: 1,
            selectedInstanceIds: [],
          }
          message.value = `${resolution.source.card.name}: escolha um alvo para o efeito.`
          break
        }

        if (
          action.type === EFFECT_ACTIONS.damage &&
          playerCandidates.length === 1 &&
          targets.length === 0
        ) {
          applyEffectAction(action, [], resolution, playerCandidates[0])
        } else {
          applyEffectAction(
            action,
            action.target.selection === EFFECT_TARGET_SELECTIONS.one
              ? targets.slice(0, 1)
              : targets,
            resolution,
          )
        }
        resolution.actionIndex += 1
      }
    } finally {
      resolvingEffects = false
    }

    if (!pendingEffectTarget.value && !effectQueue.length && pendingTurnStart) {
      pendingTurnStart = false
      finishTurnStart()
    }
  }

  function finishTurnStart() {
    const nextPlayer = currentPlayer.value
    if (nextPlayer.hasTakenTurn) {
      nextPlayer.maxMana += 1
      nextPlayer.mana = nextPlayer.maxMana
    } else {
      nextPlayer.hasTakenTurn = true
    }
    message.value = `${nextPlayer.name} começou o turno com ${nextPlayer.maxMana} de mana.`
    drawCards(nextPlayer, 1)
    currentPhase.value = PHASES.mainOne
    queueEffectEvent({ type: 'phase', phase: PHASES.mainOne, ownerIndex: currentPlayerIndex.value })
    resolveEffectQueue()
  }

  function chooseEffectTarget(instanceId: number) {
    const pending = pendingEffectTarget.value
    const resolution = effectQueue[0]
    const action = resolution?.effect.actions[resolution.actionIndex]
    const target = pending?.candidates.find(({ instance }) => instance.id === instanceId)

    if (
      !pending ||
      pending.selection !== EFFECT_TARGET_SELECTIONS.one ||
      !resolution ||
      !action ||
      action.type === EFFECT_ACTIONS.createToken ||
      !target
    ) {
      return false
    }

    applyEffectAction(action, [target], resolution)
    resolution.actionIndex += 1
    pendingEffectTarget.value = null
    resolveEffectQueue()
    return true
  }

  function toggleEffectTarget(instanceId: number) {
    const pending = pendingEffectTarget.value
    if (
      !pending ||
      pending.selection !== EFFECT_TARGET_SELECTIONS.upTo ||
      !pending.candidates.some(({ instance }) => instance.id === instanceId)
    ) {
      return false
    }

    const isSelected = pending.selectedInstanceIds.includes(instanceId)
    if (!isSelected && pending.selectedInstanceIds.length >= pending.maxTargets) {
      return false
    }

    pendingEffectTarget.value = {
      ...pending,
      selectedInstanceIds: isSelected
        ? pending.selectedInstanceIds.filter((id) => id !== instanceId)
        : [...pending.selectedInstanceIds, instanceId],
    }
    return true
  }

  function confirmEffectTargets(skipTargets = false) {
    const pending = pendingEffectTarget.value
    const resolution = effectQueue[0]
    const action = resolution?.effect.actions[resolution.actionIndex]

    if (
      !pending ||
      pending.selection !== EFFECT_TARGET_SELECTIONS.upTo ||
      !resolution ||
      (action?.type !== EFFECT_ACTIONS.addCounters && action?.type !== EFFECT_ACTIONS.destroy)
    ) {
      return false
    }

    const selectedTargets = skipTargets
      ? []
      : pending.candidates.filter(({ instance }) =>
          pending.selectedInstanceIds.includes(instance.id),
        )
    applyEffectAction(action, selectedTargets, resolution)
    resolution.actionIndex += 1
    pendingEffectTarget.value = null
    resolveEffectQueue()
    return true
  }

  function chooseEffectPlayerTarget(ownerIndex: number) {
    const pending = pendingEffectTarget.value
    const resolution = effectQueue[0]
    const action = resolution?.effect.actions[resolution.actionIndex]

    if (
      !pending ||
      !resolution ||
      action?.type !== EFFECT_ACTIONS.damage ||
      !pending.playerCandidates.includes(ownerIndex)
    ) {
      return false
    }

    applyEffectAction(action, [], resolution, ownerIndex)
    resolution.actionIndex += 1
    pendingEffectTarget.value = null
    resolveEffectQueue()
    return true
  }

  function checkStateBasedActions() {
    if (checkingStateBasedActions) {
      return
    }

    checkingStateBasedActions = true
    try {
      while (true) {
        const defeated = getOwnedCards('field').filter(
          ({ instance }) =>
            isCreature(instance) &&
            (instance.damage ?? 0) >= getEffectiveStats(instance).resistance,
        )
        if (!defeated.length) {
          break
        }

        for (const { instance, ownerIndex } of defeated) {
          removeFromField(ownerIndex, instance)
        }
        resolveEffectQueue()
        if (pendingEffectTarget.value) {
          break
        }
      }
    } finally {
      checkingStateBasedActions = false
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
    resetGame()
  }

  function canPlay(card: CardInstance) {
    return (
      !pendingEffectTarget.value &&
      canPlayCards.value &&
      currentPlayer.value.mana >= getEffectiveStats(card).cost
    )
  }

  function playCard(instance: CardInstance) {
    const player = currentPlayer.value
    const cardIndex = player.hand.findIndex(({ id }) => id === instance.id)

    if (cardIndex === -1 || !canPlay(instance)) {
      return false
    }

    player.mana -= getEffectiveStats(instance).cost
    instance.summonedOnTurn = turnNumber.value
    instance.damage = 0
    player.field.push(instance)
    player.hand.splice(cardIndex, 1)
    message.value = `${instance.card.name} entrou em campo.`
    queueEffectEvent({
      type: 'field',
      transition: 'enters',
      instance,
      ownerIndex: currentPlayerIndex.value,
    })
    resolveEffectQueue()
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

    if (pendingEffectTarget.value) {
      return
    }

    if (player.hand.length > 6) {
      isDiscarding.value = true
      message.value = `Descarte ${player.hand.length - 6} carta(s) para o cemitério antes de encerrar o turno.`
      return
    }

    isDiscarding.value = false
    
    for (const { instance } of getOwnedCards()) {
      instance.modifiers = (instance.modifiers ?? []).filter(
        (modifier) =>
          modifier.duration !== EFFECT_DURATIONS.endOfTurn ||
          modifier.expiresAtTurn !== turnNumber.value ||
          modifier.expiresForPlayer !== currentPlayerIndex.value,
      )
      if (isCreature(instance)) {
        instance.damage = 0
      }
    }

    checkStateBasedActions()

    if (pendingEffectTarget.value) {
      return
    }

    currentPlayerIndex.value = 1 - currentPlayerIndex.value
    instancesThatDamagedPlayersThisTurn.clear()
    turnNumber.value += 1
    currentPhase.value = PHASES.draw

    pendingTurnStart = true
    queueEffectEvent({ type: 'phase', phase: PHASES.draw, ownerIndex: currentPlayerIndex.value })
    resolveEffectQueue()
  }

  function isCreature(instance: CardInstance) {
    return instance.card.type.startsWith('Criatura')
  }

  function hasKeyword(instance: CardInstance, keyword: string) {
    return instance.card.keywords.some((entry) =>
      entry
        .split(',')
        .map((item) => item.trim())
        .includes(keyword),
    )
  }

  function canAttackThisTurn(instance: CardInstance) {
    return (
      isCreature(instance) &&
      (instance.summonedOnTurn !== turnNumber.value ||
        hasKeyword(instance, 'Ardor'))
    )
  }

  function canAttack(instance: CardInstance) {
    return (
      currentPhase.value === PHASES.combat &&
      combatStep.value === 'attack' &&
      currentPlayer.value.field.some(({ id }) => id === instance.id) &&
      canAttackThisTurn(instance)
    )
  }

  function canBlock(instance: CardInstance) {
    return (
      currentPhase.value === PHASES.combat &&
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
    if (
      currentPhase.value !== PHASES.combat ||
      combatStep.value !== 'attack' ||
      !attackers.value.length
    ) {
      return false
    }

    combatStep.value = 'defense'
    message.value = `${opponent.value.name}, declare seus bloqueadores.`
    queueEffectEvent({
      type: 'attacks',
      attackerIds: [...attackers.value],
      ownerIndex: currentPlayerIndex.value,
    })
    resolveEffectQueue()
    return true
  }

  function assignBlocker(defenderId: number, attackerId: number) {
    const defender = opponent.value.field.find(({ id }) => id === defenderId)
    const attacker = currentPlayer.value.field.find(({ id }) => id === attackerId)
    if (!defender || !attacker || !canBlock(defender) || !attackers.value.includes(attackerId)) {
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
    const maxDamage = attacker ? getEffectiveStats(attacker).power : 0
    const otherAssignedDamage = Object.entries(damageAssignments.value[attackerId] ?? {})
      .filter(([id]) => Number(id) !== defenderId)
      .reduce((total, [, amount]) => total + amount, 0)

    if (
      currentPhase.value !== PHASES.combat ||
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
      return currentPhase.value === PHASES.combat
    }

    if (currentPhase.value !== PHASES.combat || combatStep.value !== 'damage') {
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
      return totalDamage === (attacker ? getEffectiveStats(attacker).power : 0)
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
        .map(([id]) =>
          defendingPlayer.field.find(({ id: defenderId }) => defenderId === Number(id)),
        )
        .filter((defender): defender is CardInstance => defender !== undefined)
      const attackDamage = getEffectiveStats(attacker).power

      if (!assignedBlockers.length) {
        defendingPlayer.life -= attackDamage
        if (attackDamage > 0) {
          queueEffectEvent({
            type: 'damage-player',
            source: attacker,
            sourceOwnerIndex: currentPlayerIndex.value,
            targetOwnerIndex: 1 - currentPlayerIndex.value,
            amount: attackDamage,
          })
        }
        continue
      }

      for (const defender of assignedBlockers) {
        const damageToDefender =
          assignedBlockers.length === 1
            ? attackDamage
            : (damageAssignments.value[attackerId]?.[defender.id] ?? 0)
        damageByCard.set(defender.id, (damageByCard.get(defender.id) ?? 0) + damageToDefender)
        damageByCard.set(
          attacker.id,
          (damageByCard.get(attacker.id) ?? 0) + getEffectiveStats(defender).power,
        )
      }

      if (hasKeyword(attacker, 'Perfurar')) {
        const combinedBlockerResistance = assignedBlockers.reduce(
          (total, defender) => total + getEffectiveStats(defender).resistance,
          0,
        )
        const trampleDamage = Math.max(0, attackDamage - combinedBlockerResistance)
        if (trampleDamage > 0) {
          defendingPlayer.life -= trampleDamage
          queueEffectEvent({
            type: 'damage-player',
            source: attacker,
            sourceOwnerIndex: currentPlayerIndex.value,
            targetOwnerIndex: 1 - currentPlayerIndex.value,
            amount: trampleDamage,
          })
        }
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
      if (creature.damage >= getEffectiveStats(creature).resistance) {
        defeated.push(creature.card.name)
        removeFromField(
          owner === player ? currentPlayerIndex.value : 1 - currentPlayerIndex.value,
          creature,
        )
      }
    }

    currentPhase.value = PHASES.mainTwo
    combatStep.value = null
    attackers.value = []
    blockers.value = {}
    damageAssignments.value = {}
    isDiscarding.value = false
    message.value = defeated.length
      ? `Combate resolvido. Foram para o cemitério: ${defeated.join(', ')}.`
      : 'Combate resolvido.'
    queueEffectEvent({ type: 'phase', phase: PHASES.mainTwo, ownerIndex: currentPlayerIndex.value })
    resolveEffectQueue()
    checkStateBasedActions()
  }

  function declareDefenders() {
    if (currentPhase.value !== PHASES.combat || combatStep.value !== 'defense') {
      return false
    }

    const hasMultipleBlockers = attackers.value.some(
      (attackerId) =>
        Object.values(blockers.value).filter(
          (blockedAttackerId) => blockedAttackerId === attackerId,
        ).length > 1,
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
      currentPhase.value !== PHASES.combat ||
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
      pendingEffectTarget.value ||
      currentPhase.value !== PHASES.combat ||
      combatStep.value !== 'attack' ||
      attackers.value.length
    ) {
      return false
    }

    currentPhase.value = PHASES.mainTwo
    combatStep.value = null
    blockers.value = {}
    damageAssignments.value = {}
    message.value = 'Combate encerrado sem ataques.'
    queueEffectEvent({ type: 'phase', phase: PHASES.mainTwo, ownerIndex: currentPlayerIndex.value })
    resolveEffectQueue()
    return true
  }

  function advancePhase() {
    if (pendingEffectTarget.value) {
      return
    }

    if (currentPhase.value === PHASES.end) {
      endTurn()
      return
    }

    const nextPhase = gamePhases[phaseIndex.value + 1]

    if (nextPhase) {
      if (nextPhase.id === PHASES.combat && !currentPlayer.value.field.some(canAttackThisTurn)) {
        goToPhase(PHASES.mainTwo)
        message.value = 'Combate pulado: não há criaturas aptas a atacar.'
        return
      }

      goToPhase(nextPhase.id)
    }
  }

  function canNavigateToPhase(phase: PhaseId) {
    if (pendingEffectTarget.value) {
      return false
    }

    const targetIndex = gamePhases.findIndex(({ id }) => id === phase)
    if (currentPhase.value === PHASES.draw) {
      return phase === PHASES.mainOne
    }

    return targetIndex > phaseIndex.value
  }

  function goToPhase(phase: PhaseId) {
    if (pendingEffectTarget.value || !canNavigateToPhase(phase)) {
      return
    }

    const skippedCombat = currentPhase.value === PHASES.combat
    currentPhase.value = phase
    isDiscarding.value = false

    if (phase === PHASES.combat) {
      combatStep.value = 'attack'
      attackers.value = []
      blockers.value = {}
      damageAssignments.value = {}
      message.value = 'Selecione as criaturas que atacarão o adversário.'
      queueEffectEvent({ type: 'phase', phase, ownerIndex: currentPlayerIndex.value })
      resolveEffectQueue()
      return
    }

    if (skippedCombat) {
      combatStep.value = null
      attackers.value = []
      blockers.value = {}
      damageAssignments.value = {}
      message.value = 'Combate pulado.'
      queueEffectEvent({ type: 'phase', phase, ownerIndex: currentPlayerIndex.value })
      resolveEffectQueue()
      return
    }

    message.value = ''
    queueEffectEvent({ type: 'phase', phase, ownerIndex: currentPlayerIndex.value })
    resolveEffectQueue()
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
    pendingEffectTarget,
    canResolveCombat,
    currentPlayer,
    opponent,
    phaseIndex,
    canPlayCards,
    getEffectiveStats,
    chooseEffectTarget,
    toggleEffectTarget,
    confirmEffectTargets,
    chooseEffectPlayerTarget,
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
