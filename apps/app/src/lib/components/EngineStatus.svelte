<script lang="ts">
  import { engineStore } from '../stores/engineStore.svelte.js';
</script>

<!-- NER status banner -->
{#if engineStore.ner.status === 'loading'}
  <div
    class="flex items-center gap-3 rounded-md border border-blue-800 bg-blue-950 px-4 py-2 text-sm text-blue-300"
  >
    <svg class="h-4 w-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
      ></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
    </svg>
    <div class="flex-1 min-w-0 space-y-1">
      <span class="block">
        NER: {engineStore.ner.message || 'Loading NER model…'}
        {#if engineStore.ner.progress > 0}
          ({Math.round(engineStore.ner.progress * 100)}%)
        {/if}
      </span>
      {#if engineStore.ner.progress > 0}
        <div class="h-1 w-full overflow-hidden rounded-full bg-blue-900">
          <div
            class="h-full rounded-full bg-blue-400 transition-all duration-300"
            style="width: {Math.round(engineStore.ner.progress * 100)}%"
          ></div>
        </div>
      {/if}
    </div>
  </div>
{:else if engineStore.ner.status === 'ready'}
  <div
    class="flex items-center gap-2 rounded-md border border-emerald-800 bg-emerald-950 px-4 py-2 text-sm text-emerald-300"
  >
    <svg class="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path
        fill-rule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clip-rule="evenodd"
      />
    </svg>
    <span>NER aktiv — erweiterte Erkennung aktiv</span>
  </div>
{:else if engineStore.ner.status === 'error'}
  <div
    class="flex items-center gap-2 rounded-md border border-red-800 bg-red-950 px-4 py-2 text-sm text-red-300"
  >
    <svg class="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path
        fill-rule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
        clip-rule="evenodd"
      />
    </svg>
    <span
      >{engineStore.ner.message ||
        'NER engine failed to load — regex detection still active.'}</span
    >
  </div>
{/if}

<!-- WebLLM status banner -->
{#if engineStore.webllm.status === 'loading'}
  <div
    class="flex items-center gap-3 rounded-md border border-purple-800 bg-purple-950 px-4 py-2 text-sm text-purple-300 mt-1"
  >
    <svg class="h-4 w-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
      ></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
    </svg>
    <div class="flex-1 min-w-0 space-y-1">
      <span class="block">
        WebLLM: {engineStore.webllm.message || 'Modell wird geladen…'}
        {#if engineStore.webllm.progress > 0}
          ({Math.round(engineStore.webllm.progress * 100)}%)
        {/if}
      </span>
      {#if engineStore.webllm.progress > 0}
        <div class="h-1 w-full overflow-hidden rounded-full bg-purple-900">
          <div
            class="h-full rounded-full bg-purple-400 transition-all duration-300"
            style="width: {Math.round(engineStore.webllm.progress * 100)}%"
          ></div>
        </div>
      {/if}
    </div>
  </div>
{:else if engineStore.webllm.status === 'ready'}
  <div
    class="flex items-center gap-2 rounded-md border border-purple-800 bg-purple-950 px-4 py-2 text-sm text-purple-300 mt-1"
  >
    <svg class="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path
        fill-rule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clip-rule="evenodd"
      />
    </svg>
    <span>WebLLM aktiv — kontextuelle Erkennung aktiv</span>
  </div>
{:else if engineStore.webllm.status === 'error'}
  <div
    class="flex items-center gap-2 rounded-md border border-red-800 bg-red-950 px-4 py-2 text-sm text-red-300 mt-1"
  >
    <svg class="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path
        fill-rule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
        clip-rule="evenodd"
      />
    </svg>
    <span>{engineStore.webllm.message || 'WebLLM konnte nicht geladen werden.'}</span>
  </div>
{/if}
