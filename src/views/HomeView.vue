<template>
  <main class="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center text-white">
    <h1 class="text-4xl font-bold">Hello, world!</h1>
    <RouterLink
      to="/library"
      class="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
    >
      Open card library
    </RouterLink>
  </main>
</template>
