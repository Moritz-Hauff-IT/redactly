<script lang="ts">
  import { engineStore } from '../stores/engineStore.svelte.js';
</script>

{#if engineStore.status === 'loading'}
  <div
    class="flex items-center gap-3 rounded-md border border-blue-800 bg-blue-950 px-4 py-2 text-sm text-blue-300"
  >
    <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
      ></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
    </svg>
    <span>
      {engineStore.message || 'Loading NER model…'}
      {#if engineStore.progress > 0}
        ({Math.round(engineStore.progress * 100)}%)
      {/if}
    </span>
  </div>
{:else if engineStore.status === 'error'}
  <div class="rounded-md border border-red-800 bg-red-950 px-4 py-2 text-sm text-red-300">
    {engineStore.message || 'NER engine failed to load — regex detection still active.'}
  </div>
{/if}
