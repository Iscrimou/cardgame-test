<template>
  <main class="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center text-white">
    <h1 class="text-4xl font-bold">Magico Online</h1>
    <p class="max-w-lg text-slate-300">
      Um card game de cartas onde os jogadores batalham com cartas.
    </p>
    <nav class="flex flex-wrap justify-center gap-4">
      <RouterLink to="/game"
        class="rounded-lg bg-amber-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200">
        Iniciar partida
      </RouterLink>
      <RouterLink to="/library"
        class="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300">
        Biblioteca de cartas
      </RouterLink>
    </nav>
  </main>
</template>
