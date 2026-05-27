<script lang="ts">
  import '../app.css';
  import '../lib/setup/pdf.js';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
  }

  const { children }: Props = $props();
</script>

<div class="min-h-screen bg-slate-950 text-slate-100">
  <nav class="border-b border-slate-800 bg-slate-900 px-4 py-3">
    <div class="mx-auto flex max-w-7xl items-center gap-6">
      <a href="/" class="text-lg font-semibold text-white">de-pii</a>
      <div class="flex gap-4 text-sm">
        <a href="/" class="text-slate-300 transition-colors hover:text-white">Workspace</a>
        <a href="/about" class="text-slate-300 transition-colors hover:text-white">About</a>
        <a href="/settings" class="text-slate-300 transition-colors hover:text-white">Settings</a>
      </div>
    </div>
  </nav>
  <main class="mx-auto max-w-7xl px-4 py-6">
    {@render children()}
  </main>
</div>
