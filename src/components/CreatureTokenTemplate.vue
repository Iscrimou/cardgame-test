<script setup lang="ts">
import { computed, useId } from 'vue'
import type { Card } from '@/types/card'

const props = defineProps<{ card: Card }>()

const images = import.meta.glob<string>('/src/assets/cards-images/*', {
  eager: true,
  query: '?url',
  import: 'default',
})

const imageHref = computed(() => {
  const path = `/src/assets/cards-images/${props.card.image}`
  const url = images[path]

  if (!url) {
    throw new Error(`Imagem da ficha não encontrada: ${props.card.image}`)
  }

  return url
})

const typeLine = computed(() =>
  [props.card.type, props.card.subtype].filter(Boolean).join(' — '),
)
const keywordsText = computed(() => props.card.keywords.join(' · '))
const idPrefix = `token-${useId()}`
const ids = computed(() => {
  return {
    background: `${idPrefix}-background`,
    metal: `${idPrefix}-metal`,
    border: `${idPrefix}-border`,
    scroll: `${idPrefix}-scroll`,
    attack: `${idPrefix}-attack`,
    defense: `${idPrefix}-defense`,
    shadow: `${idPrefix}-shadow`,
    vignette: `${idPrefix}-vignette`,
    avatarClip: `${idPrefix}-avatar-clip`,
  }
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 750 1050"
    width="100%"
    height="100%"
    role="img"
    :aria-label="props.card.name"
  >
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
      <radialGradient :id="ids.attack" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#8a1c1c" />
        <stop offset="50%" stop-color="#4a0808" />
        <stop offset="90%" stop-color="#1a0000" />
        <stop offset="100%" stop-color="#050000" />
      </radialGradient>
      <radialGradient :id="ids.defense" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#4a5568" />
        <stop offset="50%" stop-color="#2d3748" />
        <stop offset="90%" stop-color="#1a202c" />
        <stop offset="100%" stop-color="#090d12" />
      </radialGradient>
      <filter :id="ids.shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow
          dx="0"
          dy="14"
          stdDeviation="12"
          flood-color="#000000"
          flood-opacity="0.95"
        />
      </filter>
      <radialGradient :id="ids.vignette" cx="50%" cy="50%" r="50%">
        <stop offset="60%" stop-color="#000000" stop-opacity="0" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.8" />
      </radialGradient>
      <clipPath :id="ids.avatarClip">
        <rect x="86" y="166" width="578" height="428" rx="4" />
      </clipPath>
    </defs>

    <rect
      x="25"
      y="25"
      width="700"
      height="1000"
      rx="36"
      :fill="`url(#${ids.background})`"
      stroke="#050507"
      stroke-width="10"
    />
    <rect
      x="48"
      y="48"
      width="654"
      height="954"
      rx="26"
      fill="none"
      :stroke="`url(#${ids.metal})`"
      stroke-width="12"
      :filter="`url(#${ids.shadow})`"
    />
    <rect
      x="64"
      y="64"
      width="622"
      height="922"
      rx="18"
      fill="none"
      :stroke="`url(#${ids.border})`"
      stroke-width="4"
    />

    <g :fill="`url(#${ids.metal})`">
      <path d="M 64,120 L 120,64 L 95,64 L 64,95 Z" />
      <circle cx="92" cy="92" r="4" fill="#0d0e11" stroke="#3f4552" stroke-width="1.5" />
      <path d="M 686,120 L 630,64 L 655,64 L 686,95 Z" />
      <circle cx="658" cy="92" r="4" fill="#0d0e11" stroke="#3f4552" stroke-width="1.5" />
      <path d="M 64,930 L 120,986 L 95,986 L 64,955 Z" />
      <circle cx="92" cy="958" r="4" fill="#0d0e11" stroke="#3f4552" stroke-width="1.5" />
      <path d="M 686,930 L 630,986 L 655,986 L 686,955 Z" />
      <circle cx="658" cy="958" r="4" fill="#0d0e11" stroke="#3f4552" stroke-width="1.5" />
    </g>

    <g id="Avatar-Frame">
      <rect
        x="80"
        y="160"
        width="590"
        height="440"
        rx="8"
        fill="#050608"
        :stroke="`url(#${ids.metal})`"
        stroke-width="6"
        :filter="`url(#${ids.shadow})`"
      />
      <g :clip-path="`url(#${ids.avatarClip})`">
        <image
          :href="imageHref"
          x="80"
          y="160"
          width="590"
          height="440"
          preserveAspectRatio="xMidYMin slice"
        />
      </g>
      <rect
        x="86"
        y="166"
        width="578"
        height="428"
        rx="4"
        :fill="`url(#${ids.vignette})`"
        pointer-events="none"
      />
      <rect
        x="86"
        y="166"
        width="578"
        height="428"
        rx="4"
        fill="none"
        stroke="#000000"
        stroke-width="6"
        opacity="0.8"
        pointer-events="none"
      />
    </g>

    <g :filter="`url(#${ids.shadow})`">
      <path
        d="M 150,580 L 600,580 L 580,612 L 170,612 Z"
        fill="#121418"
        :stroke="`url(#${ids.metal})`"
        stroke-width="2.5"
      />
      <text x="375" y="601" text-anchor="middle" class="card-type">{{ typeLine }}</text>
    </g>

    <g :filter="`url(#${ids.shadow})`">
      <path
        d="M 90,635 Q 375,628 660,635 Q 672,750 660,865 Q 375,875 90,865 Q 78,750 90,635 Z"
        :fill="`url(#${ids.scroll})`"
        stroke="#1f1810"
        stroke-width="5"
      />
      <path
        d="M 90,635 Q 375,645 660,635"
        fill="none"
        stroke="#120e0a"
        stroke-width="3"
        opacity="0.7"
      />
      <path
        d="M 90,865 Q 375,855 660,865"
        fill="none"
        stroke="#120e0a"
        stroke-width="3"
        opacity="0.7"
      />
      <path
        d="M 75,632 C 75,620 110,615 375,615 C 640,615 675,620 675,632 C 675,640 640,638 375,638 C 110,638 75,640 75,632 Z"
        :fill="`url(#${ids.border})`"
        :stroke="`url(#${ids.metal})`"
        stroke-width="2"
      />
      <path
        d="M 75,868 C 75,858 110,860 375,860 C 640,860 675,858 675,868 C 675,880 640,882 375,882 C 110,882 75,880 75,868 Z"
        :fill="`url(#${ids.border})`"
        :stroke="`url(#${ids.metal})`"
        stroke-width="2"
      />
      <text v-if="keywordsText" x="120" y="672" class="card-keyword">{{ keywordsText }}</text>
      <foreignObject x="120" :y="keywordsText ? 690 : 660" width="510" height="180">
        <div xmlns="http://www.w3.org/1999/xhtml" class="card-body">
          {{ props.card.effect }}
        </div>
      </foreignObject>
    </g>

    <g :filter="`url(#${ids.shadow})`">
      <path
        d="M 115,80 L 635,80 L 655,115 L 635,150 L 115,150 L 95,115 Z"
        :fill="`url(#${ids.scroll})`"
        stroke="#1f1810"
        stroke-width="4"
      />
      <path d="M 115,80 L 135,115 L 115,150 Z" fill="#1d1711" stroke="#0a0805" stroke-width="2" />
      <path
        d="M 635,80 L 615,115 L 635,150 Z"
        fill="#1d1711"
        stroke="#0a0805"
        stroke-width="2"
      />
      <rect
        x="140"
        y="90"
        width="470"
        height="50"
        rx="3"
        fill="none"
        :stroke="`url(#${ids.metal})`"
        stroke-width="2"
        opacity="0.8"
      />
      <text x="375" y="123" text-anchor="middle" class="card-title">{{ props.card.name }}</text>
    </g>

    <g :filter="`url(#${ids.shadow})`">
      <path
        d="M 55,875 L 145,875 L 155,935 L 100,995 L 45,935 Z"
        :fill="`url(#${ids.metal})`"
        stroke="#000000"
        stroke-width="5"
      />
      <path
        d="M 63,883 L 137,883 L 145,930 L 100,982 L 55,930 Z"
        :fill="`url(#${ids.attack})`"
        stroke="#1a0000"
        stroke-width="2.5"
      />
      <text x="100" y="935" class="stat-text">{{ props.card.attack }}</text>
    </g>

    <g :filter="`url(#${ids.shadow})`">
      <path
        d="M 605,875 L 695,875 L 705,935 L 650,995 L 595,935 Z"
        :fill="`url(#${ids.metal})`"
        stroke="#000000"
        stroke-width="5"
      />
      <path
        d="M 613,883 L 687,883 L 695,930 L 650,982 L 605,930 Z"
        :fill="`url(#${ids.defense})`"
        stroke="#080c12"
        stroke-width="2.5"
      />
      <text x="650" y="935" class="stat-text">{{ props.card.defense }}</text>
    </g>
  </svg>
</template>

<style scoped>
.card-title {
  font-family: 'Cinzel', 'Georgia', 'Times New Roman', serif;
  font-weight: bold;
  fill: #100b07;
  font-size: 18px;
  letter-spacing: 0.5px;
}

.card-type {
  font-family: 'Cinzel', 'Georgia', 'Times New Roman', serif;
  font-weight: 600;
  fill: #d1c7bd;
  font-size: 16px;
  letter-spacing: 1px;
}

.card-keyword {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-weight: bold;
  fill: #3b0d08;
  font-size: 20px;
}

.card-body {
  font-family: 'Georgia', 'Times New Roman', serif;
  color: #1c1610;
  font-size: 19px;
  line-height: 1.35;
  overflow-wrap: break-word;
}

.stat-text {
  font-family: 'Impact', 'Arial Black', sans-serif;
  font-weight: bold;
  fill: #f0e6d2;
  font-size: 42px;
  text-anchor: middle;
  dominant-baseline: central;
  filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.9));
}
</style>
