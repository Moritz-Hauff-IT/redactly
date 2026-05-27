<script lang="ts">
  import { restore } from '@de-pii/core/restorer';
  import { mappingStore } from '../stores/mappingStore.svelte.js';
  import { restoreStore } from '../stores/restoreStore.svelte.js';

  let tolerant = $state(true);
  let copied = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const mappingEmpty = $derived(!mappingStore.current || mappingStore.current.forward.size === 0);

  // Reactive: when input or mapping changes, run restore (debounced 200ms)
  $effect(() => {
    const input = restoreStore.input;
    const mapping = mappingStore.current;
    // Track tolerant for reactivity
    const _tolerant = tolerant;

    if (debounceTimer !== null) clearTimeout(debounceTimer);

    if (!input.trim() || !mapping || mapping.forward.size === 0) {
      restoreStore.setResult({ restoredText: '', restored: [], unused: [], unknown: [] });
      return;
    }

    debounceTimer = setTimeout(() => {
      const result = restore(input, mapping, { tolerant: _tolerant });
      restoreStore.setResult(result);
    }, 200);
  });

  function handleInputChange(e: Event) {
    const target = e.currentTarget as HTMLTextAreaElement;
    restoreStore.setInput(target.value);
  }

  async function copyRestoredText() {
    const text = restoreStore.result?.restoredText;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  const restoredText = $derived(restoreStore.result?.restoredText ?? '');
  const restored = $derived(restoreStore.result?.restored ?? []);
  const unused = $derived(restoreStore.result?.unused ?? []);
  const unknown = $derived(restoreStore.result?.unknown ?? []);
  const hasUnknown = $derived(unknown.length > 0);
  const hasInput = $derived(restoreStore.input.trim().length > 0);
</script>

<div class="rounded-lg border border-slate-800 bg-slate-900/60">
  <div class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
    <h2 class="text-sm font-semibold text-slate-200">Restore LLM response</h2>
    <label
      class="flex items-center gap-2 text-xs text-slate-400"
      title="Allow common LLM rewrites like [PERSON 1], <PERSON_1>, etc."
    >
      <input
        type="checkbox"
        bind:checked={tolerant}
        class="h-3.5 w-3.5 rounded border-slate-600 bg-slate-700 accent-blue-500"
      />
      Tolerant mode
    </label>
  </div>

  <div class="p-4">
    <!-- Warning banner when mapping is empty and user has typed -->
    {#if mappingEmpty && hasInput}
      <div
        class="mb-4 rounded-md border border-yellow-700/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-400"
      >
        No active mapping. Mask some input above first.
      </div>
    {/if}

    <!-- Empty state when mapping is empty and user has not typed -->
    {#if mappingEmpty && !hasInput}
      <div class="flex flex-col items-center gap-2 py-8 text-center">
        <p class="text-sm text-slate-400">Mask some text first to generate a mapping.</p>
        <p class="text-xs text-slate-600">
          Once you have a mapping, paste the LLM's response here to restore the original values.
        </p>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <!-- Left: input textarea -->
        <div class="flex flex-col gap-2">
          <span class="text-xs font-medium text-slate-400">LLM response (with placeholders)</span>
          <textarea
            data-testid="restore-textarea"
            class="min-h-48 w-full resize-none rounded-md border border-slate-700 bg-slate-900 p-3 font-mono text-sm text-slate-100 placeholder-slate-600 focus:border-slate-500 focus:outline-none"
            placeholder="Paste the LLM's response containing [PERSON_1], [EMAIL_1], etc. The originals will be restored here using your local mapping."
            value={restoreStore.input}
            oninput={handleInputChange}
          ></textarea>
        </div>

        <!-- Right: output area -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-400">Restored output</span>
            <button
              class="rounded px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40
                {copied ? 'bg-green-700 text-green-100' : 'text-slate-300 hover:bg-slate-700'}"
              disabled={!restoredText}
              onclick={copyRestoredText}
              aria-label={copied ? 'Copied to clipboard' : 'Copy restored text to clipboard'}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre
            data-testid="restored-output"
            class="min-h-48 overflow-auto rounded-md border p-3 font-mono text-sm text-slate-100 whitespace-pre-wrap
              {hasUnknown
              ? 'border-yellow-600/60 bg-slate-900'
              : 'border-slate-700 bg-slate-900'}">{restoredText ||
              'Restored text will appear here...'}</pre>
        </div>
      </div>

      <!-- Diagnostics panel -->
      {#if restoreStore.result}
        <div
          data-testid="restore-diagnostics"
          class="mt-4 flex flex-col gap-2 rounded-md border border-slate-800 bg-slate-900/40 p-3"
        >
          <span class="text-xs font-medium text-slate-400">Diagnostics</span>
          <div class="flex flex-wrap gap-4 text-xs">
            <!-- Restored count -->
            <span
              data-testid="restore-count-restored"
              class="flex items-center gap-1.5 {restored.length > 0
                ? 'text-green-400'
                : 'text-slate-500'}"
            >
              <span
                class="inline-block h-2 w-2 rounded-full {restored.length > 0
                  ? 'bg-green-400'
                  : 'bg-slate-600'}"
              ></span>
              {restored.length} placeholder{restored.length === 1 ? '' : 's'} restored
            </span>

            <!-- Unused count -->
            <span
              data-testid="restore-count-unused"
              class="flex items-center gap-1.5 text-slate-400"
              title="The LLM didn't mention these"
            >
              <span class="inline-block h-2 w-2 rounded-full bg-slate-500"></span>
              {unused.length} unused
              {#if unused.length > 0}
                <span class="text-slate-600">(the LLM didn't mention these)</span>
              {/if}
            </span>

            <!-- Unknown count -->
            <span
              data-testid="restore-count-unknown"
              class="flex items-center gap-1.5 {unknown.length > 0
                ? 'text-red-400'
                : 'text-slate-500'}"
              title="The LLM hallucinated these — check carefully"
            >
              <span
                class="inline-block h-2 w-2 rounded-full {unknown.length > 0
                  ? 'bg-red-400'
                  : 'bg-slate-600'}"
              ></span>
              {unknown.length} unknown
              {#if unknown.length > 0}
                <span class="text-red-500/70">(the LLM hallucinated these — check carefully)</span>
              {/if}
            </span>
          </div>

          <!-- Unknown chips -->
          {#if unknown.length > 0}
            <div class="mt-1 flex flex-wrap gap-1.5">
              {#each unknown as u}
                <span
                  class="rounded bg-red-900/30 px-2 py-0.5 font-mono text-xs text-red-300 border border-red-800/50"
                >
                  {u}
                </span>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>
