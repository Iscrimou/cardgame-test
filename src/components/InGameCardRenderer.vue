<script setup lang="ts">
import { computed } from 'vue'
import InGameCreatureTemplate from '@/components/InGameCreatureTemplate.vue'
import InGameCreatureTokenTemplate from '@/components/InGameCreatureTokenTemplate.vue'
import InGameMagicTemplate from '@/components/InGameMagicTemplate.vue'
import { useGameStore } from '@/stores/game'
import type { CardCounterType, CardInstance } from '@/types/game'

const props = defineProps<{
  instance: CardInstance
  zone: 'hand' | 'field'
}>()

const gameStore = useGameStore()
const effectiveStats = computed(() => gameStore.getEffectiveStats(props.instance))
const resistance = computed(() =>
  Math.max(0, effectiveStats.value.resistance - (props.instance.damage ?? 0)),
)
const counters = computed(() => {
  const counterTypes: CardCounterType[] = ['-1/-1', '+1/+1']
  return counterTypes.flatMap((type) => {
    const count = props.instance.counters?.[type] ?? 0
    return count > 0 ? [{ type, count }] : []
  })
})
const isToken = computed(() => props.instance.card.type.startsWith('Criatura Token'))
const isCreature = computed(() => props.instance.card.type.startsWith('Criatura'))
</script>

<template>
  <InGameCreatureTokenTemplate
    v-if="isToken"
    :card="props.instance.card"
    :power="effectiveStats.power"
    :resistance="resistance"
    :base-power="props.instance.card.attack ?? 0"
    :base-resistance="props.instance.card.defense ?? 0"
    :counters="counters"
  />
  <InGameCreatureTemplate
    v-else-if="isCreature"
    :card="props.instance.card"
    :zone="props.zone"
    :cost="effectiveStats.cost"
    :power="effectiveStats.power"
    :resistance="resistance"
    :base-power="props.instance.card.attack ?? 0"
    :base-resistance="props.instance.card.defense ?? 0"
    :counters="counters"
  />
  <InGameMagicTemplate
    v-else
    :card="props.instance.card"
    :zone="props.zone"
    :cost="effectiveStats.cost"
  />
</template>
