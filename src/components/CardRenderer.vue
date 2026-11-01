<script setup lang="ts">
import { computed } from 'vue'
import CardTemplate from '@/components/CardTemplate.vue'
import MagicCardTemplate from '@/components/MagicCardTemplate.vue'
import type { Card } from '@/types/card'

const props = defineProps<{ card: Card }>()

const templateComponent = computed(() =>
  props.card.type.startsWith('Criatura') ? CardTemplate : MagicCardTemplate,
)
</script>

<template>
  <component :is="templateComponent" :card="props.card" />
</template>
