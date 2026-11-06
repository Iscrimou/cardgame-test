<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import CardRenderer from '@/components/CardRenderer.vue'
import DiscardCardButton from '@/components/game/DiscardCardButton.vue'
import PlayCardButton from '@/components/game/PlayCardButton.vue'
import ZoomCardButton from '@/components/game/ZoomCardButton.vue'
import { useGameStore } from '@/stores/game'
import type { CardInstance, PhaseId, PlayerState } from '@/types/game'

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
  combatStep,
  attackers,
  blockers,
  damageAssignments,
  canResolveCombat,
} = storeToRefs(gameStore)
const {
  canPlay,
  canNavigateToPhase,
  canAttack,
  canBlock,
  toggleAttacker,
  declareAttack,
  assignBlocker,
  declareDefenders,
  setCombatDamage,
  resolveCombat,
  skipCombat,
} = gameStore
const phases = gameStore.phases

const selectedCardId = ref<number | null>(null)
const zoomedCard = ref<CardInstance | null>(null)
const graveyardOwner = ref<PlayerState | null>(null)
const defendingCardId = ref<number | null>(null)
const availableBlockTargets = computed(() =>
  currentPlayer.value.field.filter((instance) => attackers.value.includes(instance.id)),
)
const damageAllocationGroups = computed(() =>
  currentPlayer.value.field
    .filter((instance) => attackers.value.includes(instance.id))
    .map((attacker) => ({
      attacker,
      defenders: opponent.value.field.filter(
        (defender) => blockers.value[defender.id] === attacker.id,
      ),
    }))
    .filter(({ defenders }) => defenders.length > 1),
)

function openBlockerChoice(instance: CardInstance) {
  defendingCardId.value = instance.id
}

function selectBlockTarget(attackerId: number) {
  if (defendingCardId.value !== null && assignBlocker(defendingCardId.value, attackerId)) {
    defendingCardId.value = null
  }
}

function blockingAttackerName(defenderId: number) {
  const attackerId = blockers.value[defenderId]
  return currentPlayer.value.field.find(({ id }) => id === attackerId)?.card.name
}

function toggleAttack(instance: CardInstance) {
  toggleAttacker(instance)
}

function updateCombatDamage(attackerId: number, defenderId: number, event: Event) {
  if (event.target instanceof HTMLInputElement) {
    const updated = setCombatDamage(attackerId, defenderId, event.target.valueAsNumber)
    if (!updated) {
      event.target.value = String(damageAssignments.value[attackerId]?.[defenderId] ?? 0)
    }
  }
}

function assignedCombatDamage(attackerId: number) {
  return Object.values(damageAssignments.value[attackerId] ?? {}).reduce(
    (total, amount) => total + amount,
    0,
  )
}

function startGame() {
  gameStore.startGame()
  selectedCardId.value = null
  zoomedCard.value = null
  graveyardOwner.value = null
  defendingCardId.value = null
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
  defendingCardId.value = null
}

function selectPhase(phase: PhaseId) {
  gameStore.goToPhase(phase)
  selectedCardId.value = null
  defendingCardId.value = null
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
        <button v-for="(phase, index) in phases" :key="phase.id" type="button"
          :disabled="!canNavigateToPhase(phase.id)"
          :aria-current="currentPhase === phase.id ? 'step' : undefined"
          class="rounded-lg border px-3 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed"
          :class="currentPhase === phase.id
            ? 'border-amber-300 bg-amber-400 text-slate-950'
            : index < phaseIndex
              ? 'border-emerald-700 bg-emerald-950 text-emerald-200'
              : canNavigateToPhase(phase.id)
                ? 'border-slate-500 bg-slate-800 text-white hover:bg-slate-700'
                : 'border-slate-800 bg-slate-900 text-slate-500'
            " @click="selectPhase(phase.id)">
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
            <span>Vida: {{ opponent.life }}</span>
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
          <div v-for="instance in opponent.field" :key="instance.id" class="w-24 sm:w-32">
            <div class="aspect-[5/7] overflow-hidden rounded-lg">
              <CardRenderer :card="instance.card" />
            </div>
            <template v-if="instance.card.type.startsWith('Criatura')">
              <p class="mt-1 text-center text-xs text-slate-300">
                Vida: {{ (instance.card.defense ?? 0) - (instance.damage ?? 0) }}/{{ instance.card.defense }}
              </p>
              <button v-if="combatStep === 'defense' && canBlock(instance)" type="button"
                class="mt-1 w-full rounded bg-sky-800 px-2 py-1 text-xs font-semibold hover:bg-sky-700"
                @click="openBlockerChoice(instance)">
                Defender
              </button>
              <p v-else-if="blockers[instance.id] !== undefined" class="mt-1 text-center text-xs text-sky-300">
                Defendendo {{ blockingAttackerName(instance.id) }}
              </p>
            </template>
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
            <h2 class="text-lg font-bold">
              {{ currentPlayer.name }}
              <span class="text-amber-300">
                {{ combatStep === 'defense' ? `(defesa de ${opponent.name})` : '(sua vez)' }}
              </span>
            </h2>
            <p class="text-sm text-slate-300">
              Vida: {{ currentPlayer.life }} · Mana: {{ currentPlayer.mana }}/{{
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
          <div v-for="instance in currentPlayer.field" :key="instance.id" class="w-24 sm:w-32">
            <div class="aspect-[5/7] overflow-hidden rounded-lg">
              <CardRenderer :card="instance.card" />
            </div>
            <template v-if="instance.card.type.startsWith('Criatura')">
              <p class="mt-1 text-center text-xs text-slate-300">
                Vida: {{ (instance.card.defense ?? 0) - (instance.damage ?? 0) }}/{{ instance.card.defense }}
              </p>
              <button v-if="combatStep === 'attack' && canAttack(instance)" type="button"
                class="mt-1 w-full rounded px-2 py-1 text-xs font-semibold"
                :class="attackers.includes(instance.id)
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                  : 'bg-slate-700 text-white hover:bg-slate-600'"
                :aria-pressed="attackers.includes(instance.id)" @click="toggleAttack(instance)">
                {{ attackers.includes(instance.id) ? 'Remover ataque' : 'Atacar' }}
              </button>
              <p v-else-if="attackers.includes(instance.id)" class="mt-1 text-center text-xs text-amber-300">
                Atacando
              </p>
              <p v-else-if="combatStep === 'attack' && instance.summonedOnTurn === turnNumber"
                class="mt-1 text-center text-xs text-slate-400">
                Enjoo de invocação
              </p>
            </template>
          </div>
          <p v-if="!currentPlayer.field.length" class="self-center text-sm text-slate-500">
            Suas cartas jogadas aparecerão aqui.
          </p>
        </div>

        <section v-if="combatStep === 'damage'" class="mt-5 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
          <h3 class="font-semibold">Distribua o dano de ataque</h3>
          <p class="mt-1 text-sm text-slate-400">
            Atribua todo o dano de cada atacante entre as criaturas que o bloqueiam.
          </p>
          <div v-for="group in damageAllocationGroups" :key="group.attacker.id" class="mt-4">
            <p class="text-sm font-semibold text-amber-200">
              {{ group.attacker.card.name }} · {{ group.attacker.card.attack ?? 0 }} de dano
              (atribuído: {{ assignedCombatDamage(group.attacker.id) }})
            </p>
            <div class="mt-2 grid gap-2 sm:grid-cols-2">
              <label v-for="defender in group.defenders" :key="defender.id"
                class="flex items-center justify-between gap-3 rounded-lg bg-slate-800 px-3 py-2 text-sm">
                <span>{{ defender.card.name }}</span>
                <input type="number" min="0" :max="group.attacker.card.attack ?? 0"
                  :value="damageAssignments[group.attacker.id]?.[defender.id] ?? 0"
                  :aria-label="`Dano de ${group.attacker.card.name} em ${defender.card.name}`"
                  class="w-20 rounded bg-slate-950 px-2 py-1 text-right text-white"
                  @input="updateCombatDamage(group.attacker.id, defender.id, $event)">
              </label>
            </div>
          </div>
        </section>

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
          <template v-if="currentPhase === 'combat' && combatStep === 'attack'">
            <button v-if="attackers.length" type="button"
              class="rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300"
              @click="declareAttack">
              Declarar ataque
            </button>
            <button v-else type="button"
              class="rounded-lg bg-slate-700 px-5 py-3 font-bold text-white hover:bg-slate-600"
              @click="skipCombat">
              Pular combate
            </button>
          </template>
          <button v-if="currentPhase === 'combat' && combatStep === 'defense'" type="button"
            class="rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300"
            @click="declareDefenders">
            Declarar defensores
          </button>
          <button v-if="currentPhase === 'combat' && combatStep === 'damage'" type="button"
            class="rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canResolveCombat" @click="resolveCombat">
            Resolver combate
          </button>
          <button v-if="currentPhase !== 'end'" type="button"
            class="rounded-lg bg-slate-700 px-5 py-3 font-bold text-white hover:bg-slate-600"
            @click="advancePhase">
            Avançar fase
          </button>
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

    <div v-if="defendingCardId !== null"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm" role="dialog"
      aria-modal="true" aria-labelledby="blocker-choice-title" @click.self="defendingCardId = null">
      <section class="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <h2 id="blocker-choice-title" class="text-xl font-bold">Escolha qual atacante esta criatura vai defender</h2>
        <p class="mt-1 text-sm text-slate-400">Uma criatura pode defender apenas um atacante.</p>
        <div class="mt-4 flex flex-col gap-2">
          <button v-for="attacker in availableBlockTargets" :key="attacker.id" type="button"
            class="rounded-lg bg-slate-800 px-4 py-3 text-left hover:bg-slate-700"
            @click="selectBlockTarget(attacker.id)">
            {{ attacker.card.name }} · {{ attacker.card.attack ?? 0 }}/{{ attacker.card.defense ?? 0 }}
          </button>
          <p v-if="!availableBlockTargets.length" class="text-sm text-slate-400">
            Não há atacantes para bloquear.
          </p>
        </div>
        <button type="button"
          class="mt-4 rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
          @click="defendingCardId = null">
          Cancelar
        </button>
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
