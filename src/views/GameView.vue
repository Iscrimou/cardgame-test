<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import cards from '@/data/cards.json'
import CardTemplate from '@/components/CardTemplate.vue'
import DiscardCardButton from '@/components/game/DiscardCardButton.vue'
import PlayCardButton from '@/components/game/PlayCardButton.vue'
import ZoomCardButton from '@/components/game/ZoomCardButton.vue'
import type { Card } from '@/types/card'

type CardInstance = {
  id: number
  card: Card
}

type PlayerState = {
  name: string
  deck: CardInstance[]
  hand: CardInstance[]
  field: CardInstance[]
  graveyard: CardInstance[]
  maxMana: number
  mana: number
  hasTakenTurn: boolean
}

const phases = [
  { id: 'draw', label: 'Compra' },
  { id: 'main-one', label: 'Principal 1' },
  { id: 'combat', label: 'Combate' },
  { id: 'main-two', label: 'Principal 2' },
  { id: 'end', label: 'Fim do turno' },
] as const

type PhaseId = (typeof phases)[number]['id']

const players = ref<[PlayerState, PlayerState]>([
  {
    name: 'Jogador 1',
    deck: [],
    hand: [],
    field: [],
    graveyard: [],
    maxMana: 1,
    mana: 1,
    hasTakenTurn: false,
  },
  {
    name: 'Jogador 2',
    deck: [],
    hand: [],
    field: [],
    graveyard: [],
    maxMana: 1,
    mana: 1,
    hasTakenTurn: false,
  },
])
const currentPlayerIndex = ref(0)
const currentPhase = ref<PhaseId>('draw')
const turnNumber = ref(1)
const selectedCardId = ref<number | null>(null)
const zoomedCard = ref<CardInstance | null>(null)
const graveyardOwner = ref<PlayerState | null>(null)
const isDiscarding = ref(false)
const message = ref('')
let nextCardId = 0

const currentPlayer = computed(() =>
  currentPlayerIndex.value === 0 ? players.value[0] : players.value[1],
)
const opponent = computed(() =>
  currentPlayerIndex.value === 0 ? players.value[1] : players.value[0],
)
const phaseIndex = computed(() => phases.findIndex(({ id }) => id === currentPhase.value))
const canPlayCards = computed(
  () => currentPhase.value === 'main-one' || currentPhase.value === 'main-two',
)

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
      name: 'Jogador 1',
      deck: createDeck(),
      hand: [],
      field: [],
      graveyard: [],
      maxMana: 1,
      mana: 1,
      hasTakenTurn: true,
    },
    {
      name: 'Jogador 2',
      deck: createDeck(),
      hand: [],
      field: [],
      graveyard: [],
      maxMana: 1,
      mana: 1,
      hasTakenTurn: false,
    },
  ]
  drawCards(players.value[0], 5)
  drawCards(players.value[1], 5)
  currentPlayerIndex.value = 0
  currentPhase.value = 'draw'
  turnNumber.value = 1
  selectedCardId.value = null
  graveyardOwner.value = null
  isDiscarding.value = false
  message.value = ''
  drawCards(players.value[0], 1)
}

function canPlay(card: CardInstance) {
  return canPlayCards.value && currentPlayer.value?.mana >= card.card.cost
}

function playCard(instance: CardInstance) {
  const player = currentPlayer.value
  const cardIndex = player.hand.findIndex(({ id }) => id === instance.id)

  if (cardIndex === -1 || !canPlay(instance)) {
    return
  }

  player.mana -= instance.card.cost
  player.field.push(instance)
  player.hand.splice(cardIndex, 1)
  selectedCardId.value = null
  message.value = `${instance.card.name} entrou em campo.`
}

function discardCard(instance: CardInstance) {
  const player = currentPlayer.value
  const cardIndex = player.hand.findIndex(({ id }) => id === instance.id)

  if (!isDiscarding.value || cardIndex === -1 || player.hand.length <= 6) {
    return
  }

  const [discardedCard] = player.hand.splice(cardIndex, 1)

  if (!discardedCard) {
    return
  }

  player.graveyard.push(discardedCard)
  selectedCardId.value = null

  if (player.hand.length <= 6) {
    isDiscarding.value = false
    message.value = `${discardedCard.card.name} foi para o cemitério. Sua mão está no limite; encerre o turno.`
    return
  }

  message.value = `${discardedCard.card.name} foi para o cemitério. Descarte mais ${player.hand.length - 6}.`
}

function endTurn() {
  const player = currentPlayer.value

  if (player.hand.length > 6) {
    isDiscarding.value = true
    selectedCardId.value = null
    message.value = `Descarte ${player.hand.length - 6} carta(s) para o cemitério antes de encerrar o turno.`
    return
  }

  isDiscarding.value = false
  currentPlayerIndex.value = 1 - currentPlayerIndex.value
  turnNumber.value += 1
  currentPhase.value = 'draw'
  selectedCardId.value = null

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

  const nextPhase = phases[phaseIndex.value + 1]

  if (nextPhase) {
    currentPhase.value = nextPhase.id
    selectedCardId.value = null

    if (nextPhase.id === 'combat') {
      message.value = 'Fase de combate: as ações de ataque ainda não estão implementadas.'
    } else {
      message.value = ''
    }
    isDiscarding.value = false
  }
}

function isNextPhase(phase: PhaseId) {
  return phases[phaseIndex.value + 1]?.id === phase
}

function closeZoom() {
  zoomedCard.value = null
}

function openGraveyard(player: PlayerState) {
  if (player.graveyard.length) {
    graveyardOwner.value = player
  }
}

function closeGraveyard() {
  graveyardOwner.value = null
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeZoom()
    closeGraveyard()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

startGame()
</script>

<template>
  <main class="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-8">
    <div class="mx-auto flex max-w-7xl flex-col gap-6">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <RouterLink to="/" class="text-sm text-amber-300 hover:text-amber-200">← Início</RouterLink>
          <h1 class="mt-2 text-3xl font-bold">Partida local</h1>
        </div>
        <div class="flex items-center gap-3">
          <span class="rounded-lg bg-slate-800 px-4 py-2 text-sm">Turno {{ turnNumber }}</span>
          <button
            type="button"
            class="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
            @click="startGame"
          >
            Nova partida
          </button>
        </div>
      </header>

      <nav aria-label="Fases do turno" class="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <button
          v-for="(phase, index) in phases"
          :key="phase.id"
          type="button"
          :disabled="!isNextPhase(phase.id)"
          :aria-current="currentPhase === phase.id ? 'step' : undefined"
          class="rounded-lg border px-3 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed"
          :class="
            currentPhase === phase.id
              ? 'border-amber-300 bg-amber-400 text-slate-950'
              : index < phaseIndex
                ? 'border-emerald-700 bg-emerald-950 text-emerald-200'
                : isNextPhase(phase.id)
                  ? 'border-slate-500 bg-slate-800 text-white hover:bg-slate-700'
                  : 'border-slate-800 bg-slate-900 text-slate-500'
          "
          @click="advancePhase"
        >
          {{ phase.label }}
        </button>
      </nav>

      <p v-if="message" class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-amber-100">
        {{ message }}
      </p>

      <section
        v-if="opponent"
        aria-label="Área do adversário"
        class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-lg font-bold">{{ opponent.name }}</h2>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-300">
            <span>Mana: {{ opponent.mana }}/{{ opponent.maxMana }}</span>
            <span>Mão: {{ opponent.hand.length }}</span>
            <span>Baralho: {{ opponent.deck.length }}</span>
            <button
              type="button"
              class="rounded text-amber-300 underline decoration-dotted underline-offset-2 hover:text-amber-200 disabled:cursor-default disabled:text-slate-500 disabled:no-underline"
              :disabled="!opponent.graveyard.length"
              @click="openGraveyard(opponent)"
            >
              Cemitério: {{ opponent.graveyard.length }}
            </button>
          </div>
        </div>
        <div class="mt-4 flex min-h-32 flex-wrap justify-center gap-3">
          <div
            v-for="instance in opponent.field"
            :key="instance.id"
            class="aspect-[5/7] w-24 overflow-hidden rounded-lg sm:w-32"
          >
            <CardTemplate :card="instance.card" />
          </div>
          <p v-if="!opponent.field.length" class="self-center text-sm text-slate-500">
            Nenhuma carta em campo.
          </p>
        </div>
      </section>

      <section
        v-if="currentPlayer"
        aria-label="Área do jogador ativo"
        class="rounded-2xl border border-amber-900/60 bg-slate-900/80 p-4 sm:p-6"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-lg font-bold">{{ currentPlayer.name }} <span class="text-amber-300">(sua vez)</span></h2>
            <p class="text-sm text-slate-300">
              Fase: {{ phases[phaseIndex]?.label }} · Mana: {{ currentPlayer.mana }}/{{
                currentPlayer.maxMana
              }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
            <span>Mão: {{ currentPlayer.hand.length }}</span>
            <span>Baralho: {{ currentPlayer.deck.length }}</span>
            <button
              type="button"
              class="rounded text-amber-300 underline decoration-dotted underline-offset-2 hover:text-amber-200 disabled:cursor-default disabled:text-slate-500 disabled:no-underline"
              :disabled="!currentPlayer.graveyard.length"
              @click="openGraveyard(currentPlayer)"
            >
              Cemitério: {{ currentPlayer.graveyard.length }}
            </button>
          </div>
        </div>

        <div class="mt-4 flex min-h-40 flex-wrap justify-center gap-3 rounded-xl bg-black/20 p-3">
          <div
            v-for="instance in currentPlayer.field"
            :key="instance.id"
            class="aspect-[5/7] w-24 overflow-hidden rounded-lg sm:w-32"
          >
            <CardTemplate :card="instance.card" />
          </div>
          <p v-if="!currentPlayer.field.length" class="self-center text-sm text-slate-500">
            Suas cartas jogadas aparecerão aqui.
          </p>
        </div>

        <h3 class="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-300">Sua mão</h3>
        <p v-if="!currentPlayer.hand.length" class="mt-3 text-sm text-slate-500">
          Você não tem cartas na mão.
        </p>
        <div v-else class="mt-3 flex flex-wrap justify-center gap-4">
          <div
            v-for="instance in currentPlayer.hand"
            :key="instance.id"
            class="relative aspect-[5/7] w-32 sm:w-40"
          >
            <button
              type="button"
              class="h-full w-full overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              :aria-label="`Selecionar ${instance.card.name}, custo ${instance.card.cost}`"
              :aria-pressed="selectedCardId === instance.id"
              @click="selectedCardId = instance.id"
            >
              <CardTemplate :card="instance.card" />
            </button>
            <div
              v-if="selectedCardId === instance.id"
              class="absolute left-1/2 top-2 flex -translate-x-1/2 gap-2"
            >
              <ZoomCardButton
                :card-name="instance.card.name"
                @click="zoomedCard = instance"
              />
              <PlayCardButton
                v-if="canPlay(instance)"
                :card-name="instance.card.name"
                :cost="instance.card.cost"
                @click="playCard(instance)"
              />
              <DiscardCardButton
                v-if="isDiscarding && currentPlayer.hand.length > 6"
                :card-name="instance.card.name"
                @click="discardCard(instance)"
              />
            </div>
          </div>
        </div>

        <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 pt-4">
          <p class="text-sm text-slate-400">
            <template v-if="!canPlayCards">Cartas só podem ser jogadas nas fases principais.</template>
            <template v-else>Selecione uma carta com custo igual ou menor que sua mana disponível.</template>
          </p>
          <button
            v-if="currentPhase === 'end'"
            type="button"
            class="rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300"
            :disabled="isDiscarding && currentPlayer.hand.length > 6"
            :class="{ 'cursor-not-allowed opacity-50': isDiscarding && currentPlayer.hand.length > 6 }"
            @click="endTurn"
          >
            Encerrar turno
          </button>
        </div>
      </section>
    </div>

    <div
      v-if="zoomedCard"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      :aria-label="zoomedCard.card.name"
      @click.self="closeZoom"
    >
      <button
        type="button"
        class="absolute right-5 top-5 rounded-full bg-slate-800 px-4 py-2 text-lg text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        aria-label="Fechar carta ampliada"
        @click="closeZoom"
      >
        &times;
      </button>

      <div class="h-[min(85vh,calc((100vw-3rem)*1.4))] w-[min(calc(100vw-3rem),calc(85vh/1.4))]">
        <CardTemplate :card="zoomedCard.card" />
      </div>
    </div>

    <div
      v-if="graveyardOwner"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      :aria-label="`Cemitério de ${graveyardOwner.name}`"
      @click.self="closeGraveyard"
    >
      <section class="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <header class="flex items-start justify-between gap-4 border-b border-slate-700 pb-4">
          <div>
            <h2 class="text-xl font-bold">Cemitério · {{ graveyardOwner.name }}</h2>
            <p class="mt-1 text-sm text-slate-400">
              {{ graveyardOwner.graveyard.length }} carta(s)
            </p>
          </div>
          <button
            type="button"
            class="rounded-full bg-slate-800 px-4 py-2 text-lg text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            aria-label="Fechar cemitério"
            @click="closeGraveyard"
          >
            &times;
          </button>
        </header>
        <ul class="mt-4 grid grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          <li
            v-for="instance in graveyardOwner.graveyard"
            :key="instance.id"
            class="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-white">{{ instance.card.name }}</p>
              <p class="truncate text-xs text-slate-400">{{ instance.card.type }}</p>
            </div>
            <span class="shrink-0 rounded-full bg-slate-700 px-2 py-1 text-xs text-amber-200">
              {{ instance.card.cost }} mana
            </span>
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>
