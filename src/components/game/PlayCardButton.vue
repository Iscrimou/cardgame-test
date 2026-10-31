<script setup lang="ts">
import setIcon from '@/assets/icons/set.svg?url'

defineProps<{
  cardName: string
  cost: number
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-lg transition-colors hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    :aria-label="`Colocar ${cardName} em campo por ${cost} de mana`"
    :title="`Colocar em campo · ${cost} mana`"
    @click="$emit('click')"
  >
    <img :src="setIcon" alt="" aria-hidden="true" class="h-5 w-5 brightness-0 invert" />
  </button>
</template>
