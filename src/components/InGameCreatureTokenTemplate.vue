<script setup lang="ts">
import { ZONES } from '@/consts/zones'
import InGameCreatureTemplate from '@/components/InGameCreatureTemplate.vue'
import type { Card } from '@/types/card'
import type { CardCounterDisplay } from '@/types/game'

defineProps<{
  card: Card
  power: number
  resistance: number
  basePower: number
  baseResistance: number
  counters: CardCounterDisplay[]
}>()
</script>

<template>
  <InGameCreatureTemplate
    :card="card"
    :zone="ZONES.field"
    :power="power"
    :resistance="resistance"
    :base-power="basePower"
    :base-resistance="baseResistance"
    :counters="counters"
  />
</template>
