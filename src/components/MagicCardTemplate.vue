<script setup lang="ts">
import rarities from '@/data/rarity.json'
import type { Card } from '@/types/card'
import { computed } from 'vue'

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
    throw new Error(`Imagem da carta não encontrada: ${props.card.image}`)
  }

  return url
})

const keywordsText = computed(() => props.card.keywords.join(' · '))
const rarityColor = computed(() => {
  if (props.card.rarity === undefined) {
    return null
  }

  const rarity = rarities.find(({ id }) => id === props.card.rarity)

  if (!rarity) {
    throw new Error(`Raridade não encontrada para o ID: ${props.card.rarity}`)
  }

  return rarity.color
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
      <radialGradient id="bgGradient" cx="50%" cy="50%" r="75%">
        <stop offset="0%" stop-color="#1c1d22" />
        <stop offset="55%" stop-color="#0d0e11" />
        <stop offset="100%" stop-color="#030405" />
      </radialGradient>

      <linearGradient id="darkMetal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2c3038" />
        <stop offset="25%" stop-color="#5a6270" />
        <stop offset="50%" stop-color="#1e2126" />
        <stop offset="75%" stop-color="#404652" />
        <stop offset="100%" stop-color="#0f1114" />
      </linearGradient>

      <linearGradient id="ironBorder" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#1f232a" />
        <stop offset="50%" stop-color="#0d0e12" />
        <stop offset="100%" stop-color="#181a20" />
      </linearGradient>

      <linearGradient id="darkScroll" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#a39379" />
        <stop offset="30%" stop-color="#80715b" />
        <stop offset="70%" stop-color="#594c3b" />
        <stop offset="100%" stop-color="#30271c" />
      </linearGradient>

      <radialGradient id="manaVoid" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#a83232" />
        <stop offset="40%" stop-color="#5e0f15" />
        <stop offset="85%" stop-color="#240306" />
        <stop offset="100%" stop-color="#080001" />
      </radialGradient>

      <filter id="heavyShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#000000" flood-opacity="0.95" />
      </filter>

      <radialGradient id="artVignette" cx="50%" cy="50%" r="50%">
        <stop offset="60%" stop-color="#000000" stop-opacity="0" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.8" />
      </radialGradient>

      <clipPath id="avatarClip">
        <rect x="86" y="166" width="578" height="428" rx="4" />
      </clipPath>
    </defs>

    <rect
      x="25"
      y="25"
      width="700"
      height="1000"
      rx="36"
      fill="url(#bgGradient)"
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
      stroke="url(#darkMetal)"
      stroke-width="12"
      filter="url(#heavyShadow)"
    />
    <rect
      x="64"
      y="64"
      width="622"
      height="922"
      rx="18"
      fill="none"
      stroke="url(#ironBorder)"
      stroke-width="4"
    />

    <g fill="url(#darkMetal)">
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
        stroke="url(#darkMetal)"
        stroke-width="6"
        filter="url(#heavyShadow)"
      />
      <g clip-path="url(#avatarClip)">
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
        fill="url(#artVignette)"
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

    <g id="Type-Bar" filter="url(#heavyShadow)">
      <path
        d="M 150,580 L 600,580 L 580,612 L 170,612 Z"
        fill="#121418"
        stroke="url(#darkMetal)"
        stroke-width="2.5"
      />
      <text x="375" y="601" text-anchor="middle" class="card-type">{{ props.card.type }}</text>
    </g>

    <g id="Scroll-Area" filter="url(#heavyShadow)">
      <path
        d="M 90,635 Q 375,628 660,635 Q 672,750 660,865 Q 375,875 90,865 Q 78,750 90,635 Z"
        fill="url(#darkScroll)"
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
        fill="url(#ironBorder)"
        stroke="url(#darkMetal)"
        stroke-width="2"
      />
      <path
        d="M 75,868 C 75,858 110,860 375,860 C 640,860 675,858 675,868 C 675,880 640,882 375,882 C 110,882 75,880 75,868 Z"
        fill="url(#ironBorder)"
        stroke="url(#darkMetal)"
        stroke-width="2"
      />

      <text v-if="keywordsText" x="120" y="672" class="card-keyword">{{ keywordsText }}</text>

      <foreignObject x="120" y="690" width="510" height="82">
        <div xmlns="http://www.w3.org/1999/xhtml" class="card-body">
          {{ props.card.effect }}
        </div>
      </foreignObject>

      <line
        v-if="props.card.inscription"
        x1="200"
        y1="785"
        x2="550"
        y2="785"
        stroke="#302315"
        stroke-width="1"
        opacity="0.6"
        stroke-dasharray="6,4"
      />

      <text v-if="props.card.inscription" x="375" y="820" text-anchor="middle" class="card-flavor">
        <tspan x="375" dy="0">{{ props.card.inscription }}</tspan>
      </text>
    </g>

    <g id="Header-Banner" filter="url(#heavyShadow)">
      <path
        d="M 115,80 L 635,80 L 655,115 L 635,150 L 115,150 L 95,115 Z"
        fill="url(#darkScroll)"
        stroke="#1f1810"
        stroke-width="4"
      />
      <path d="M 115,80 L 135,115 L 115,150 Z" fill="#1d1711" stroke="#0a0805" stroke-width="2" />
      <path d="M 635,80 L 615,115 L 635,150 Z" fill="#1d1711" stroke="#0a0805" stroke-width="2" />
      <rect
        x="140"
        y="90"
        width="470"
        height="50"
        rx="3"
        fill="none"
        stroke="url(#darkMetal)"
        stroke-width="2"
        opacity="0.8"
      />
      <text x="375" y="123" text-anchor="middle" class="card-title">{{ props.card.name }}</text>
    </g>

    <g id="Cost-Indicator" filter="url(#heavyShadow)">
      <polygon
        points="90,50 135,85 135,145 90,180 45,145 45,85"
        fill="url(#darkMetal)"
        stroke="#000000"
        stroke-width="5"
      />
      <polygon
        points="90,58 127,88 127,140 90,170 53,140 53,88"
        fill="url(#manaVoid)"
        stroke="#1a0204"
        stroke-width="3"
      />
      <circle cx="90" cy="114" r="34" fill="none" stroke="#000000" stroke-width="3" opacity="0.5" />
      <text x="90" y="115" class="cost-text">{{ props.card.cost }}</text>
    </g>

    <g id="Center-Emblem" filter="url(#heavyShadow)">
      <polygon
        points="375,915 390,935 375,955 360,935"
        fill="url(#darkMetal)"
        stroke="#000000"
        stroke-width="2"
      />
      <circle v-if="rarityColor" cx="375" cy="935" r="4" :fill="rarityColor" />
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

.card-flavor {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-style: italic;
  fill: #f0e0ce;
  font-size: 16px;
}

.cost-text {
  font-family: 'Impact', 'Arial Black', sans-serif;
  font-weight: bold;
  fill: #ffffff;
  font-size: 48px;
  text-anchor: middle;
  dominant-baseline: central;
  filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.9));
}
</style>
