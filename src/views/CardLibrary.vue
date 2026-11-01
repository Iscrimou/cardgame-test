<script setup lang="ts">
import cards from '@/data/cards.json'
import CardRenderer from '@/components/CardRenderer.vue'
import { onMounted, onUnmounted, ref } from 'vue'

const selectedCard = ref<(typeof cards)[number] | null>(null)

function closeCard() {
  selectedCard.value = null
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeCard()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <main class="min-h-screen bg-slate-950 px-6 py-10 text-white sm:px-10">
    <div class="mx-auto max-w-7xl">
      <h1 class="mb-8 text-3xl font-bold">Card Library</h1>

      <div v-if="cards.length" class="flex flex-wrap justify-center gap-8">
        <button
          v-for="card in cards"
          :key="card.name"
          type="button"
          :aria-label="`Abrir carta ${card.name}`"
          class="aspect-[5/7] w-full max-w-[280px] shrink-0 cursor-zoom-in rounded-2xl transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400"
          @click="selectedCard = card"
        >
          <CardRenderer :card="card" />
        </button>
      </div>

      <p v-else class="text-slate-300">No cards available.</p>
    </div>

    <div
      v-if="selectedCard"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      :aria-label="selectedCard.name"
      @click.self="closeCard"
    >
      <button
        type="button"
        class="absolute right-5 top-5 rounded-full bg-slate-800 px-4 py-2 text-lg text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        aria-label="Fechar carta"
        @click="closeCard"
      >
        &times;
      </button>

      <div class="h-[min(85vh,calc((100vw-3rem)*1.4))] w-[min(calc(100vw-3rem),calc(85vh/1.4))]">
        <CardRenderer :card="selectedCard" />
      </div>
    </div>
  </main>
</template>