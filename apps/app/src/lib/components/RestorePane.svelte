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

<div class="rounded-lg border border-[color:var(--color-rule)] bg-[color:var(--color-bg-elev)]">
  <header
    class="flex items-center justify-between border-b border-[color:var(--color-rule)] px-4 py-3"
  >
    <h2
      class="font-[family-name:var(--font-serif)] text-[16px] leading-none font-medium text-[color:var(--color-ink)]"
    >
      LLM-Antwort wiederherstellen
    </h2>
    <label
      class="flex items-center gap-2 text-[11.5px] text-[color:var(--color-ink-soft)]"
      title="Erlaubt LLM-Schreibvarianten wie [PERSON 1], <PERSON_1>, …"
    >
      <input
        type="checkbox"
        bind:checked={tolerant}
        class="h-3.5 w-3.5 accent-[color:var(--color-accent)]"
      />
      tolerant
    </label>
  </header>

  <div class="p-4">
    {#if mappingEmpty && hasInput}
      <div
        class="mb-4 rounded-md border border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] px-3 py-2 text-[12px] text-[color:var(--color-accent)]"
      >
        Kein aktives Mapping — erst etwas oben unter „redact" maskieren.
      </div>
    {/if}

    {#if mappingEmpty && !hasInput}
      <div class="flex flex-col items-center gap-2 py-10 text-center">
        <p class="text-[13px] text-[color:var(--color-ink-soft)]">
          Erst oben maskieren, um ein Mapping zu erzeugen.
        </p>
        <p
          class="max-w-md font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
        >
          Sobald ein Mapping existiert, kannst du hier die LLM-Antwort einfügen und die echten Werte
          werden lokal restauriert.
        </p>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="flex flex-col gap-2">
          <span class="label">LLM-Antwort (mit Platzhaltern)</span>
          <textarea
            data-testid="restore-textarea"
            class="min-h-48 w-full resize-none rounded-md border border-[color:var(--color-rule)] bg-[color:var(--color-bg)] p-3 font-[family-name:var(--font-mono)] text-[13px] leading-[1.6] text-[color:var(--color-ink)] placeholder-[color:var(--color-ink-mute)] focus:border-[color:var(--color-accent)] focus:outline-none"
            placeholder={`LLM-Antwort hier einfügen — z.B. „Klar, schicke die Rechnung an [EMAIL_1] (IBAN [IBAN_1])."`}
            spellcheck="false"
            value={restoreStore.input}
            oninput={handleInputChange}
          ></textarea>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="label">Wiederhergestellt</span>
            <button class="btn-ghost" disabled={!restoredText} onclick={copyRestoredText}>
              {#if copied}
                <span class="text-[color:var(--color-ok)]">kopiert ✓</span>
              {:else}
                kopieren
              {/if}
            </button>
          </div>
          <pre
            data-testid="restored-output"
            class="min-h-48 overflow-auto rounded-md border p-3 font-[family-name:var(--font-mono)] text-[13px] leading-[1.6] whitespace-pre-wrap text-[color:var(--color-ink)]
              {hasUnknown
              ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]/40'
              : 'border-[color:var(--color-rule)] bg-[color:var(--color-bg)]'}">{restoredText ||
              'Wiederhergestellter Text erscheint hier …'}</pre>
        </div>
      </div>

      {#if restoreStore.result}
        <div
          data-testid="restore-diagnostics"
          class="mt-4 flex flex-wrap items-center gap-4 rounded-md border border-[color:var(--color-rule)] bg-[color:var(--color-bg)] px-3.5 py-2.5 text-[11.5px]"
        >
          <span
            data-testid="restore-count-restored"
            class="flex items-center gap-1.5 {restored.length > 0
              ? 'text-[color:var(--color-ok)]'
              : 'text-[color:var(--color-ink-mute)]'}"
          >
            <span
              class="inline-block h-2 w-2 rounded-full {restored.length > 0
                ? 'bg-[color:var(--color-ok)]'
                : 'bg-[color:var(--color-rule-strong)]'}"
            ></span>
            {restored.length} restauriert
          </span>

          <span
            data-testid="restore-count-unused"
            class="flex items-center gap-1.5 text-[color:var(--color-ink-mute)]"
            title="Das LLM hat diese nicht erwähnt"
          >
            <span class="inline-block h-2 w-2 rounded-full bg-[color:var(--color-rule-strong)]"
            ></span>
            {unused.length} ungenutzt
          </span>

          <span
            data-testid="restore-count-unknown"
            class="flex items-center gap-1.5 {unknown.length > 0
              ? 'text-[color:var(--color-danger)]'
              : 'text-[color:var(--color-ink-mute)]'}"
            title="Das LLM hat Platzhalter halluziniert — sorgfältig prüfen"
          >
            <span
              class="inline-block h-2 w-2 rounded-full {unknown.length > 0
                ? 'bg-[color:var(--color-danger)]'
                : 'bg-[color:var(--color-rule-strong)]'}"
            ></span>
            {unknown.length} unbekannt
          </span>

          {#if unknown.length > 0}
            <div class="flex flex-wrap gap-1.5">
              {#each unknown as u}
                <span
                  class="token border-[color:var(--color-danger)] text-[color:var(--color-danger)]"
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
