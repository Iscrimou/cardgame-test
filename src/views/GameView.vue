<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import CardRenderer from '@/components/CardRenderer.vue'
import DiscardCardButton from '@/components/game/DiscardCardButton.vue'
import PlayCardButton from '@/components/game/PlayCardButton.vue'
import ZoomCardButton from '@/components/game/ZoomCardButton.vue'
import { useGameStore } from '@/stores/game'
import type { CardInstance, PlayerState } from '@/types/game'

const gameStore = useGameStore()
const {
  currentPlayer,
  opponent,
  currentPhase,
  turnNumber,
  phaseIndex,
  canPlayCards,
  isDiscarding,
  message,
} = storeToRefs(gameStore)
const { canPlay, isNextPhase } = gameStore
const phases = gameStore.phases

const selectedCardId = ref<number | null>(null)
const zoomedCard = ref<CardInstance | null>(null)
const graveyardOwner = ref<PlayerState | null>(null)

function startGame() {
  gameStore.startGame()
  selectedCardId.value = null
  zoomedCard.value = null
  graveyardOwner.value = null
}

function playCard(instance: CardInstance) {
  if (gameStore.playCard(instance)) {
    selectedCardId.value = null
  }
}

function discardCard(instance: CardInstance) {
  if (gameStore.discardCard(instance)) {
    selectedCardId.value = null
  }
}

function endTurn() {
  gameStore.endTurn()
  selectedCardId.value = null
}

function advancePhase() {
  gameStore.advancePhase()
  selectedCardId.value = null
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
          <button type="button" class="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
            @click="startGame">
            Nova partida
          </button>
        </div>
      </header>

      <nav aria-label="Fases do turno" class="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <button v-for="(phase, index) in phases" :key="phase.id" type="button" :disabled="!isNextPhase(phase.id)"
          :aria-current="currentPhase === phase.id ? 'step' : undefined"
          class="rounded-lg border px-3 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed"
          :class="currentPhase === phase.id
              ? 'border-amber-300 bg-amber-400 text-slate-950'
              : index < phaseIndex
                ? 'border-emerald-700 bg-emerald-950 text-emerald-200'
                : isNextPhase(phase.id)
                  ? 'border-slate-500 bg-slate-800 text-white hover:bg-slate-700'
                  : 'border-slate-800 bg-slate-900 text-slate-500'
            " @click="advancePhase">
          {{ phase.label }}
        </button>
      </nav>

      <p v-if="message" class="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-amber-100">
        {{ message }}
      </p>

      <section v-if="opponent" aria-label="Área do adversário"
        class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-lg font-bold">{{ opponent.name }}</h2>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-300">
            <span>Mana: {{ opponent.mana }}/{{ opponent.maxMana }}</span>
            <span>Mão: {{ opponent.hand.length }}</span>
            <span>Baralho: {{ opponent.deck.length }}</span>
            <button type="button"
              class="rounded text-amber-300 underline decoration-dotted underline-offset-2 hover:text-amber-200 disabled:cursor-default disabled:text-slate-500 disabled:no-underline"
              :disabled="!opponent.graveyard.length" @click="openGraveyard(opponent)">
              Cemitério: {{ opponent.graveyard.length }}
            </button>
          </div>
        </div>
        <div class="mt-4 flex min-h-32 flex-wrap justify-center gap-3">
          <div v-for="instance in opponent.field" :key="instance.id"
            class="aspect-[5/7] w-24 overflow-hidden rounded-lg sm:w-32">
            <CardRenderer :card="instance.card" />
          </div>
          <p v-if="!opponent.field.length" class="self-center text-sm text-slate-500">
            Nenhuma carta em campo.
          </p>
        </div>
      </section>

      <section v-if="currentPlayer" aria-label="Área do jogador ativo"
        class="rounded-2xl border border-amber-900/60 bg-slate-900/80 p-4 sm:p-6">
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
            <button type="button"
              class="rounded text-amber-300 underline decoration-dotted underline-offset-2 hover:text-amber-200 disabled:cursor-default disabled:text-slate-500 disabled:no-underline"
              :disabled="!currentPlayer.graveyard.length" @click="openGraveyard(currentPlayer)">
              Cemitério: {{ currentPlayer.graveyard.length }}
            </button>
          </div>
        </div>

        <div class="mt-4 flex min-h-40 flex-wrap justify-center gap-3 rounded-xl bg-black/20 p-3">
          <div v-for="instance in currentPlayer.field" :key="instance.id"
            class="aspect-[5/7] w-24 overflow-hidden rounded-lg sm:w-32">
            <CardRenderer :card="instance.card" />
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
          <div v-for="instance in currentPlayer.hand" :key="instance.id" class="relative aspect-[5/7] w-32 sm:w-40">
            <button type="button"
              class="h-full w-full overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              :aria-label="`Selecionar ${instance.card.name}, custo ${instance.card.cost}`"
              :aria-pressed="selectedCardId === instance.id" @click="selectedCardId = instance.id">
              <CardRenderer :card="instance.card" />
            </button>
            <div v-if="selectedCardId === instance.id" class="absolute left-1/2 top-2 flex -translate-x-1/2 gap-2">
              <ZoomCardButton :card-name="instance.card.name" @click="zoomedCard = instance" />
              <PlayCardButton v-if="canPlay(instance)" :card-name="instance.card.name" :cost="instance.card.cost"
                @click="playCard(instance)" />
              <DiscardCardButton v-if="isDiscarding && currentPlayer.hand.length > 6" :card-name="instance.card.name"
                @click="discardCard(instance)" />
            </div>
          </div>
        </div>

        <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 pt-4">
          <p class="text-sm text-slate-400">
            <template v-if="!canPlayCards">Cartas só podem ser jogadas nas fases principais.</template>
            <template v-else>Selecione uma carta com custo igual ou menor que sua mana disponível.</template>
          </p>
          <button v-if="currentPhase === 'end'" type="button"
            class="rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300"
            :disabled="isDiscarding && currentPlayer.hand.length > 6"
            :class="{ 'cursor-not-allowed opacity-50': isDiscarding && currentPlayer.hand.length > 6 }"
            @click="endTurn">
            Encerrar turno
          </button>
        </div>
      </section>
    </div>

    <div v-if="zoomedCard" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
      role="dialog" aria-modal="true" :aria-label="zoomedCard.card.name" @click.self="closeZoom">
      <button type="button"
        class="absolute right-5 top-5 rounded-full bg-slate-800 px-4 py-2 text-lg text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        aria-label="Fechar carta ampliada" @click="closeZoom">
        &times;
      </button>

      <div class="h-[min(85vh,calc((100vw-3rem)*1.4))] w-[min(calc(100vw-3rem),calc(85vh/1.4))]">
        <CardRenderer :card="zoomedCard.card" />
      </div>
    </div>

    <div v-if="graveyardOwner"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm" role="dialog"
      aria-modal="true" :aria-label="`Cemitério de ${graveyardOwner.name}`" @click.self="closeGraveyard">
      <section
        class="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <header class="flex items-start justify-between gap-4 border-b border-slate-700 pb-4">
          <div>
            <h2 class="text-xl font-bold">Cemitério · {{ graveyardOwner.name }}</h2>
            <p class="mt-1 text-sm text-slate-400">
              {{ graveyardOwner.graveyard.length }} carta(s)
            </p>
          </div>
          <button type="button"
            class="rounded-full bg-slate-800 px-4 py-2 text-lg text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            aria-label="Fechar cemitério" @click="closeGraveyard">
            &times;
          </button>
        </header>
        <ul class="mt-4 grid grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          <li v-for="instance in graveyardOwner.graveyard" :key="instance.id"
            class="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2">
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
