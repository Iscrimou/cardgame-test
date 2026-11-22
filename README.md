# cardgame-test

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Testes

```sh
npm test
```

### Efeitos de cartas

O campo `effect` em `src/data/cards.json` é o texto exibido na carta. Para comportamento executável, use o campo opcional `effects`, composto por gatilhos e ações declarativos. Exemplo:

```json
{
  "trigger": {
    "type": "other-enters-field",
    "filter": {
      "controller": "you",
      "type": "Criatura",
      "subtype": "Lobo",
      "cost": { "min": 4 }
    }
  },
  "actions": [
    {
      "type": "modify",
      "target": { "selection": "source", "filter": {} },
      "power": 2,
      "duration": "end-of-turn"
    }
  ]
}
```

Gatilhos disponíveis: `enters-field`, `leaves-field`, `other-enters-field`, `other-leaves-field`, `phase` e `continuous`. Fases usam os IDs `draw`, `main-one`, `combat`, `main-two` e `end`; gatilhos de fase pertencem ao turno do controlador por padrão (`turn: "any"` os executa em ambos os turnos).

Filtros aceitam `controller` (`you`, `opponent`, `any`), `zone` (`field`, `hand`, `any`), `type` (prefixo), `subtype` e `cost`, `power` ou `resistance` (valor exato ou intervalo `{ "min": n, "max": n }`). Custo é comparado ao valor impresso; poder e resistência consideram os valores efetivos no momento da seleção. Alvos contínuos são avaliados em sequência, usando os bônus contínuos já aplicados nessa avaliação.

Ações suportadas: `modify` (alterações numéricas; duração `permanent` ou `end-of-turn`), `create-token` (com uma definição completa de carta) e `destroy`. Alvos de `modify` e `destroy` usam `selection`: `source`, `event`, `one` ou `all`; `one` abre uma escolha quando há mais de um alvo válido e não faz nada quando não há alvos. A seleção `up-to`, usada por `add-counters`, permite escolher opcionalmente de zero até o limite definido em `maxTargets` alvos válidos. Efeitos que ainda não têm uma ação ou gatilho estruturado continuam sendo apenas texto.

Efeitos `continuous` usam ações `modify` e permanecem ativos enquanto a fonte estiver em campo. Modificadores temporários expiram ao final do turno ativo em que foram aplicados. A resolução encadeada de efeitos tem um limite de segurança para interromper ciclos acidentais.
