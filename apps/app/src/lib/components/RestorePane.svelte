<script lang="ts">
  import { restore } from '@redactly/core/restorer';
  import { mappingStore } from '../stores/mappingStore.svelte.js';
  import { restoreStore } from '../stores/restoreStore.svelte.js';
  import { errorStore } from '../stores/errorStore.svelte.js';
  import { deserializeMapping } from '@redactly/core/masker';
  import { isEncryptedMapping } from '@redactly/core/mappingCrypto';
  import PasswordDialog from './PasswordDialog.svelte';
  import { loc, t } from '$lib/i18n/locale.svelte.js';

  interface Props {
    /** Render bare (no outer card / header) to sit flush in the workspace bridge. */
    embedded?: boolean;
  }
  const { embedded = false }: Props = $props();

  // Load a previously-saved mapping so you can restore in a fresh session.
  let mapInputEl = $state<HTMLInputElement | null>(null);
  // Encrypted-import state: hold the envelope text until a password is given.
  let pendingEnvelope = $state<string | null>(null);
  let decryptError = $state<string | null>(null);

  function applyMapping(m: ReturnType<typeof deserializeMapping>) {
    mappingStore.set(m);
    errorStore.show(t('map_import_ok', { n: m.forward.size }));
  }

  async function handleMapFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const text = await file.text();
    if (isEncryptedMapping(text)) {
      // Encrypted file → ask for the password before we can read it.
      decryptError = null;
      pendingEnvelope = text;
      return;
    }
    try {
      applyMapping(deserializeMapping(text));
    } catch (err) {
      errorStore.show(
        t('map_import_err', { message: err instanceof Error ? err.message : 'unbekannt' })
      );
    }
  }

  async function decryptPending(password: string) {
    if (!pendingEnvelope) return;
    try {
      const { decryptMapping } = await import('@redactly/core/mappingCrypto');
      const m = await decryptMapping(pendingEnvelope, password);
      pendingEnvelope = null;
      decryptError = null;
      applyMapping(m);
    } catch (err) {
      // Keep the dialog open and surface the error inline (wrong password).
      decryptError = err instanceof Error ? err.message : 'unbekannt';
    }
  }

  let tolerant = $state(true);
  let copied = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const s = {
    heading: { de: 'LLM-Antwort wiederherstellen', en: 'Restore LLM response' },
    tolerantTip: {
      de: 'Erlaubt LLM-Schreibvarianten wie [PERSON 1], <PERSON_1>, …',
      en: 'Accepts LLM variants like [PERSON 1], <PERSON_1>, …',
    },
    tolerantLabel: { de: 'tolerant', en: 'tolerant' },
    noMappingWarn: {
      de: 'Kein aktives Mapping — erst etwas oben unter „redact" maskieren.',
      en: "No active mapping yet — mask something above under 'redact' first.",
    },
    emptyTitle: {
      de: 'Erst oben maskieren, um ein Mapping zu erzeugen.',
      en: 'Mask something above to create a mapping first.',
    },
    emptyBody: {
      de: 'Sobald ein Mapping existiert, kannst du hier die LLM-Antwort einfügen und die echten Werte werden lokal restauriert.',
      en: 'Once a mapping exists, paste the LLM response here and the originals are restored locally.',
    },
    inputLabel: { de: 'LLM-Antwort (mit Platzhaltern)', en: 'LLM response (with placeholders)' },
    inputPlaceholder: {
      de: 'LLM-Antwort hier einfügen — z.B. „Klar, schicke die Rechnung an [EMAIL_1] (IBAN [IBAN_1])."',
      en: 'Paste the LLM response here — e.g. "Sure, sending the invoice to [EMAIL_1] (IBAN [IBAN_1])."',
    },
    outputLabel: { de: 'Wiederhergestellt', en: 'Restored' },
    copy: { de: 'kopieren', en: 'copy' },
    copied: { de: 'kopiert ✓', en: 'copied ✓' },
    outputEmpty: {
      de: 'Wiederhergestellter Text erscheint hier …',
      en: 'Restored text will appear here…',
    },
    restoredCount: { de: '{n} restauriert', en: '{n} restored' },
    unusedTip: { de: 'Das LLM hat diese nicht erwähnt', en: "The LLM didn't reference these" },
    unusedCount: { de: '{n} ungenutzt', en: '{n} unused' },
    unknownTip: {
      de: 'Das LLM hat Platzhalter halluziniert — sorgfältig prüfen',
      en: 'The LLM hallucinated placeholders — check carefully',
    },
    unknownCount: { de: '{n} unbekannt', en: '{n} unknown' },
  } as const;

  function tsub(template: string, params: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_m, n) => String(params[n] ?? `{${n}}`));
  }

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

{#snippet tolerantToggle()}
  <label
    class="flex items-center gap-2 text-[11.5px] text-[color:var(--color-ink-soft)]"
    title={loc(s.tolerantTip)}
  >
    <input
      type="checkbox"
      bind:checked={tolerant}
      class="h-3.5 w-3.5 accent-[color:var(--color-accent)]"
    />
    {loc(s.tolerantLabel)}
  </label>
{/snippet}

{#snippet mapImport()}
  <input
    bind:this={mapInputEl}
    type="file"
    accept="application/json,.json"
    class="sr-only"
    onchange={handleMapFile}
    aria-label={t('map_import')}
  />
  <button class="btn-ghost" onclick={() => mapInputEl?.click()} title={t('map_import')}>
    ↑ {t('map_import')}
  </button>
{/snippet}

{#snippet body()}
  <div class="p-4">
    {#if mappingEmpty && hasInput}
      <div
        class="mb-4 rounded-md border border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] px-3 py-2 text-[12px] text-[color:var(--color-accent)]"
      >
        {loc(s.noMappingWarn)}
      </div>
    {/if}

    {#if mappingEmpty && !hasInput}
      <div class="flex flex-col items-center gap-2 py-10 text-center">
        <p class="text-[13px] text-[color:var(--color-ink-soft)]">
          {loc(s.emptyTitle)}
        </p>
        <p
          class="max-w-md font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
        >
          {loc(s.emptyBody)}
        </p>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-4 {embedded ? '' : 'lg:grid-cols-2'}">
        <div class="flex flex-col gap-2">
          <span class="label">{loc(s.inputLabel)}</span>
          <textarea
            data-testid="restore-textarea"
            class="min-h-48 w-full resize-none rounded-md border border-[color:var(--color-rule)] bg-[color:var(--color-bg)] p-3 font-[family-name:var(--font-mono)] text-[13px] leading-[1.6] text-[color:var(--color-ink)] placeholder-[color:var(--color-ink-mute)] focus:border-[color:var(--color-accent)] focus:outline-none"
            placeholder={loc(s.inputPlaceholder)}
            spellcheck="false"
            value={restoreStore.input}
            oninput={handleInputChange}
          ></textarea>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="label">{loc(s.outputLabel)}</span>
            <button class="btn-ghost" disabled={!restoredText} onclick={copyRestoredText}>
              {#if copied}
                <span class="text-[color:var(--color-ok)]">{loc(s.copied)}</span>
              {:else}
                {loc(s.copy)}
              {/if}
            </button>
          </div>
          <pre
            data-testid="restored-output"
            class="min-h-48 overflow-auto rounded-md border p-3 font-[family-name:var(--font-mono)] text-[13px] leading-[1.6] whitespace-pre-wrap text-[color:var(--color-ink)]
              {hasUnknown
              ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]/40'
              : 'border-[color:var(--color-rule)] bg-[color:var(--color-bg)]'}">{restoredText ||
              loc(s.outputEmpty)}</pre>
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
            {tsub(loc(s.restoredCount), { n: restored.length })}
          </span>

          <span
            data-testid="restore-count-unused"
            class="flex items-center gap-1.5 text-[color:var(--color-ink-mute)]"
            title={loc(s.unusedTip)}
          >
            <span class="inline-block h-2 w-2 rounded-full bg-[color:var(--color-rule-strong)]"
            ></span>
            {tsub(loc(s.unusedCount), { n: unused.length })}
          </span>

          <span
            data-testid="restore-count-unknown"
            class="flex items-center gap-1.5 {unknown.length > 0
              ? 'text-[color:var(--color-danger)]'
              : 'text-[color:var(--color-ink-mute)]'}"
            title={loc(s.unknownTip)}
          >
            <span
              class="inline-block h-2 w-2 rounded-full {unknown.length > 0
                ? 'bg-[color:var(--color-danger)]'
                : 'bg-[color:var(--color-rule-strong)]'}"
            ></span>
            {tsub(loc(s.unknownCount), { n: unknown.length })}
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
{/snippet}

{#if embedded}
  <div class="flex min-h-0 flex-1 flex-col overflow-auto">
    <div
      class="flex items-center justify-between gap-3 border-b border-[color:var(--color-rule)] px-4 py-2.5"
    >
      <span class="label">{loc(s.heading)}</span>
      <div class="flex items-center gap-3">
        {@render mapImport()}
        {@render tolerantToggle()}
      </div>
    </div>
    {@render body()}
  </div>
{:else}
  <div class="rounded-lg border border-[color:var(--color-rule)] bg-[color:var(--color-bg-elev)]">
    <header
      class="flex items-center justify-between border-b border-[color:var(--color-rule)] px-4 py-3"
    >
      <h2
        class="font-[family-name:var(--font-serif)] text-[16px] leading-none font-medium text-[color:var(--color-ink)]"
      >
        {loc(s.heading)}
      </h2>
      <div class="flex items-center gap-3">
        {@render mapImport()}
        {@render tolerantToggle()}
      </div>
    </header>
    {@render body()}
  </div>
{/if}

<PasswordDialog
  open={pendingEnvelope !== null}
  title={t('pw_import_title')}
  body={t('pw_import_body')}
  error={decryptError}
  onsubmit={decryptPending}
  oncancel={() => {
    pendingEnvelope = null;
    decryptError = null;
  }}
/>
