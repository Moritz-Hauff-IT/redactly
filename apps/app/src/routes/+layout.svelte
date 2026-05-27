<script lang="ts">
  import '../app.css';
  import '../lib/setup/pdf.js';
  import Toast from '$lib/components/Toast.svelte';
  import EngineStatus from '$lib/components/EngineStatus.svelte';
  import { onMount } from 'svelte';
  import { settingsStore } from '$lib/stores/settingsStore.svelte.js';
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
  }

  const { children }: Props = $props();

  onMount(() => {
    // Auto-load NER only if the user previously enabled it (key present in localStorage).
    // Absent key means first visit or user never enabled it → don't auto-enable.
    if (settingsStore.nerEnabled) {
      // Lazy import to keep loadNer out of the initial bundle evaluation path.
      import('$lib/core/nerLoader.js').then(({ loadNer }) => {
        loadNer().catch((err: unknown) => {
          console.error('Auto NER load failed:', err);
        });
      });
    }
  });
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

  <!-- Engine status banner — visible when NER is loading, ready, or errored -->
  <div class="border-b border-slate-800 bg-slate-900/50 empty:hidden">
    <div class="mx-auto max-w-7xl px-4 py-2">
      <EngineStatus />
    </div>
  </div>

  <main class="mx-auto max-w-7xl px-4 py-6">
    {@render children()}
  </main>
  <Toast />
</div>
