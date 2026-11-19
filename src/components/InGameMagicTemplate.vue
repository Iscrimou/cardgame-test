<script setup lang="ts">
import { computed, useId } from 'vue'
import type { Card } from '@/types/card'

const props = defineProps<{
  card: Card
  zone: 'hand' | 'field'
  cost?: number
}>()

const images = import.meta.glob<string>('/src/assets/cards-images/*', {
  eager: true,
  query: '?url',
  import: 'default',
})

const imageHref = computed(() => {
  const path = `/src/assets/cards-images/${props.card.image}`
  const url = images[path]

  if (!url) {
    throw new Error(`Imagem da carta não encontrada: ${props.card.image}`)
  }

  return url
})

const showCost = computed(() => props.zone === 'hand' && props.cost !== undefined)
const idPrefix = `in-game-magic-${useId()}`
const ids = {
  background: `${idPrefix}-background`,
  metal: `${idPrefix}-metal`,
  border: `${idPrefix}-border`,
  scroll: `${idPrefix}-scroll`,
  mana: `${idPrefix}-mana`,
  shadow: `${idPrefix}-shadow`,
  artClip: `${idPrefix}-art-clip`,
}
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="100%" height="100%" role="img"
    :aria-label="props.card.name">
    <defs>
      <radialGradient :id="ids.background" cx="50%" cy="50%" r="75%">
        <stop offset="0%" stop-color="#1c1d22" />
        <stop offset="55%" stop-color="#0d0e11" />
        <stop offset="100%" stop-color="#030405" />
      </radialGradient>
      <linearGradient :id="ids.metal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2c3038" />
        <stop offset="25%" stop-color="#5a6270" />
        <stop offset="50%" stop-color="#1e2126" />
        <stop offset="75%" stop-color="#404652" />
        <stop offset="100%" stop-color="#0f1114" />
      </linearGradient>
      <linearGradient :id="ids.border" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#1f232a" />
        <stop offset="50%" stop-color="#0d0e12" />
        <stop offset="100%" stop-color="#181a20" />
      </linearGradient>
      <linearGradient :id="ids.scroll" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#a39379" />
        <stop offset="30%" stop-color="#80715b" />
        <stop offset="70%" stop-color="#594c3b" />
        <stop offset="100%" stop-color="#30271c" />
      </linearGradient>
      <radialGradient :id="ids.mana" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#a83232" />
        <stop offset="40%" stop-color="#5e0f15" />
        <stop offset="85%" stop-color="#240306" />
        <stop offset="100%" stop-color="#080001" />
      </radialGradient>
      <filter :id="ids.shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#000000" flood-opacity="0.95" />
      </filter>
      <clipPath :id="ids.artClip">
        <rect x="82" y="160" width="586" height="720" rx="6" />
      </clipPath>
    </defs>

    <rect x="25" y="25" width="700" height="1000" rx="36" :fill="`url(#${ids.background})`" stroke="#050507"
      stroke-width="10" />
    <g :clip-path="`url(#${ids.artClip})`">
      <image :href="imageHref" x="82" y="160" width="586" height="720" preserveAspectRatio="xMidYMid slice" />
      <rect x="82" y="160" width="586" height="720" fill="#000000" opacity="0.12" />
    </g>
    <rect x="48" y="48" width="654" height="954" rx="26" fill="none" :stroke="`url(#${ids.metal})`" stroke-width="12"
      :filter="`url(#${ids.shadow})`" />
    <rect x="64" y="64" width="622" height="922" rx="18" fill="none" :stroke="`url(#${ids.border})`" stroke-width="4" />

    <g :filter="`url(#${ids.shadow})`">
      <path d="M 115,80 L 635,80 L 655,115 L 635,150 L 115,150 L 95,115 Z" :fill="`url(#${ids.scroll})`"
        stroke="#1f1810" stroke-width="4" />
      <path d="M 115,80 L 135,115 L 115,150 Z" fill="#1d1711" stroke="#0a0805" stroke-width="2" />
      <path d="M 635,80 L 615,115 L 635,150 Z" fill="#1d1711" stroke="#0a0805" stroke-width="2" />
      <rect x="140" y="90" width="470" height="50" rx="3" fill="none" :stroke="`url(#${ids.metal})`" stroke-width="2"
        opacity="0.8" />
      <text x="375" y="123" text-anchor="middle" class="card-title">{{ props.card.name }}</text>
    </g>

    <g v-if="showCost" :filter="`url(#${ids.shadow})`">
      <polygon points="100,38 160,82 160,158 100,202 40,158 40,82" :fill="`url(#${ids.metal})`" stroke="#000000"
        stroke-width="6" />
      <polygon points="100,49 150,86 150,153 100,190 50,153 50,86" :fill="`url(#${ids.mana})`" stroke="#1a0204"
        stroke-width="3" />
      <text x="100" y="120" class="cost-text">{{ props.cost }}</text>
    </g>
  </svg>
</template>

<style scoped>
.card-title,
.card-type {
  font-family: 'Cinzel', 'Georgia', 'Times New Roman', serif;
  font-weight: 600;
}

.card-title {
  fill: #100b07;
  font-size: 18px;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.card-type {
  fill: #d1c7bd;
  font-size: 16px;
  letter-spacing: 1px;
}

.cost-text {
  font-family: 'Impact', 'Arial Black', sans-serif;
  font-weight: bold;
  fill: #ffffff;
  font-size: 56px;
  text-anchor: middle;
  dominant-baseline: central;
  filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.9));
}
</style>
