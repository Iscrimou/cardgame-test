<script setup lang="ts">
import zoomIcon from '@/assets/icons/zoom.svg?url'

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
    class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-white shadow-lg transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    :aria-label="`Ampliar carta ${cardName}`"
    :title="`Ampliar carta ${cardName}`"
    @click="$emit('click')"
  >
    <img :src="zoomIcon" alt="" aria-hidden="true" class="h-5 w-5 brightness-0 invert" />
  </button>
</template>
