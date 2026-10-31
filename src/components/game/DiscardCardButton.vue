<script setup lang="ts">
import discardIcon from '@/assets/icons/discard.svg?url'

defineProps<{
  cardName: string
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-700 text-white shadow-lg transition-colors hover:bg-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    :aria-label="`Descartar ${cardName}`"
    :title="`Descartar ${cardName}`"
    @click="$emit('click')"
  >
    <img :src="discardIcon" alt="" aria-hidden="true" class="h-5 w-5 brightness-0 invert" />
  </button>
</template>
