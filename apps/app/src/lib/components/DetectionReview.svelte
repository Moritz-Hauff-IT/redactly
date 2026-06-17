<script lang="ts">
  import type { EntityCategory } from '@redactly/core/types';
  import { detectionStore, type EntityWithId } from '../stores/detectionStore.svelte.js';
  import { mappingStore } from '../stores/mappingStore.svelte.js';
  import { loc } from '$lib/i18n/locale.svelte.js';

  interface Props {
    /** Compact vertical card list for the workspace inspector column. */
    inspector?: boolean;
  }
  const { inspector = false }: Props = $props();

  const CATEGORY_LABELS: Record<EntityCategory, { de: string; en: string }> = {
    person: { de: 'Person', en: 'Person' },
    contact: { de: 'Kontakt', en: 'Contact' },
    address: { de: 'Adresse', en: 'Address' },
    financial: { de: 'Finanz', en: 'Finance' },
    identity: { de: 'ID', en: 'ID' },
    secret: { de: 'Secret', en: 'Secret' },
    organization: { de: 'Firma', en: 'Org' },
    other: { de: 'Sonstiges', en: 'Other' },
  };

  // UI strings local to this component
  const s = {
    heading: { de: 'Mapping', en: 'Mapping' },
    countSummary: { de: '{a} aktiv / {t} erkannt', en: '{a} active / {t} detected' },
    filterAll: { de: 'alle', en: 'all' },
    filterOn: { de: 'aktiv', en: 'active' },
    filterOff: { de: 'ignoriert', en: 'ignored' },
    emptyTitle: { de: 'Noch keine PII erkannt', en: 'No PII detected yet' },
    emptyBody: {
      de: 'Tippe oder lade Text und klick „Maskieren". Was hier nicht auftaucht, wurde nicht erkannt — prüf ggf. NER oder WebLLM in den Einstellungen.',
      en: 'Type or load text and click "Mask". Anything not shown here wasn\'t detected — enable NER or WebLLM in settings if you need broader coverage.',
    },
    catAll: { de: 'alles', en: 'all' },
    colCategory: { de: 'Kategorie', en: 'Category' },
    colOriginal: { de: 'Original', en: 'Original' },
    colReplacement: { de: 'Ersatz', en: 'Replacement' },
    colActions: { de: 'Aktionen', en: 'Actions' },
    toggleAria: { de: 'Toggle {x}', en: 'Toggle {x}' },
    removeAria: { de: 'Manuellen Eintrag entfernen', en: 'Remove manual entry' },
  } as const;

  function tsub(template: string, params: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_m, n) => String(params[n] ?? `{${n}}`));
  }

  function truncateSecret(text: string): string {
    if (text.length <= 16) return text;
    return `${text.slice(0, 6)}…${text.slice(-4)}`;
  }

  /** Look up the actual placeholder allocated by the masker for this entity's text. */
  function placeholderFor(entity: EntityWithId): string {
    const m = mappingStore.current;
    const real = m?.reverse.get(entity.text);
    if (real) return real;
    // Not yet masked (or entity ignored) — show a dimmed dash.
    return '—';
  }

  function activeFilter(active: 'all' | 'on' | 'off') {
    return (e: EntityWithId): boolean => {
      const on = detectionStore.enabledIds.has(e.id);
      if (active === 'all') return true;
      if (active === 'on') return on;
      return !on;
    };
  }

  let filter = $state<'all' | 'on' | 'off'>('all');
  let categoryFilter = $state<EntityCategory | 'ALL'>('ALL');

  const filteredEntities = $derived(
    detectionStore.entities.filter(activeFilter(filter)).filter((e) => {
      if (categoryFilter === 'ALL') return true;
      return e.category === categoryFilter;
    })
  );

  const totalEntities = $derived(detectionStore.entities.length);
  const totalActive = $derived(detectionStore.activeEntities.length);

  const categoryCounts = $derived.by(() => {
    const counts: Record<string, number> = {};
    for (const e of detectionStore.entities) counts[e.category] = (counts[e.category] ?? 0) + 1;
    return counts;
  });
</script>

{#if inspector}
  <div class="pane">
    <div class="pane-head">
      <span class="pane-title">{loc({ de: 'Erkannte Daten', en: 'Detected data' })}</span>
      <span
        class="font-[family-name:var(--font-mono)] text-[10.5px] text-[color:var(--color-ink-mute)]"
      >
        🔒 {loc({ de: 'lokal', en: 'local' })}
      </span>
    </div>

    {#if totalEntities === 0}
      <div class="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
        <p class="text-[13px] text-[color:var(--color-ink-soft)]">{loc(s.emptyTitle)}</p>
        <p
          class="font-[family-name:var(--font-mono)] text-[11px] leading-relaxed text-[color:var(--color-ink-mute)]"
        >
          {loc(s.emptyBody)}
        </p>
      </div>
    {:else}
      <div
        class="flex flex-wrap items-center gap-1.5 border-b border-[color:var(--color-rule)] px-3 py-2.5"
      >
        <button class="chip" class:active={filter === 'all'} onclick={() => (filter = 'all')}>
          {loc(s.filterAll)} · {totalEntities}
        </button>
        <button class="chip" class:active={filter === 'on'} onclick={() => (filter = 'on')}>
          {loc(s.filterOn)} · {totalActive}
        </button>
        <button class="chip" class:active={filter === 'off'} onclick={() => (filter = 'off')}>
          {loc(s.filterOff)}
        </button>
      </div>

      <div class="flex min-h-0 flex-1 flex-col gap-1 overflow-auto p-2">
        {#each filteredEntities as entity (entity.id)}
          {@const isActive = detectionStore.enabledIds.has(entity.id)}
          {@const displayText =
            entity.category === 'secret' ? truncateSecret(entity.text) : entity.text}
          {@const ph = placeholderFor(entity)}
          <div
            class="grid grid-cols-[auto_1fr_auto] items-center gap-x-2.5 gap-y-1 rounded-lg px-2.5 py-2 transition-colors hover:bg-[color:var(--color-bg-sunk)]"
            class:opacity-40={!isActive}
          >
            <input
              type="checkbox"
              checked={isActive}
              class="h-3.5 w-3.5 accent-[color:var(--color-accent)]"
              onchange={() => detectionStore.toggleEntity(entity.id)}
              aria-label={tsub(loc(s.toggleAria), { x: entity.text })}
            />
            {#if isActive && ph !== '—'}
              <span class="token justify-self-start">{ph}</span>
            {:else}
              <span class="ent justify-self-start" data-cat={entity.category}>
                {loc(CATEGORY_LABELS[entity.category])}
              </span>
            {/if}
            <div class="flex items-center gap-2 justify-self-end">
              <span
                class="font-[family-name:var(--font-mono)] text-[10px] text-[color:var(--color-ink-mute)]"
              >
                {Math.round(entity.confidence * 100)}%
              </span>
              {#if entity.source === 'manual'}
                <button
                  class="text-[color:var(--color-ink-mute)] transition-colors hover:text-[color:var(--color-danger)]"
                  onclick={() => detectionStore.removeEntity(entity.id)}
                  aria-label={loc(s.removeAria)}
                  title={loc({ de: 'entfernen', en: 'remove' })}
                >
                  ×
                </button>
              {/if}
            </div>
            <div
              class="col-span-3 truncate font-[family-name:var(--font-mono)] text-[11.5px] text-[color:var(--color-accent-2)]"
              title={entity.text}
            >
              {displayText}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{:else}
  <section
    class="rounded-lg border border-[color:var(--color-rule)] bg-[color:var(--color-bg-elev)]"
  >
    <header
      class="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-rule)] px-4 py-3"
    >
      <div class="flex items-baseline gap-3">
        <h2
          class="font-[family-name:var(--font-serif)] text-[16px] leading-none font-medium text-[color:var(--color-ink)]"
        >
          {loc(s.heading)}
        </h2>
        {#if totalEntities > 0}
          <span
            class="font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
          >
            {tsub(loc(s.countSummary), { a: totalActive, t: totalEntities })}
          </span>
        {/if}
      </div>
      {#if totalEntities > 0}
        <div class="flex flex-wrap items-center gap-1.5">
          <!-- Status filter chips -->
          <button class="chip" class:active={filter === 'all'} onclick={() => (filter = 'all')}
            >{loc(s.filterAll)}</button
          >
          <button class="chip" class:active={filter === 'on'} onclick={() => (filter = 'on')}
            >{loc(s.filterOn)}</button
          >
          <button class="chip" class:active={filter === 'off'} onclick={() => (filter = 'off')}
            >{loc(s.filterOff)}</button
          >
        </div>
      {/if}
    </header>

    {#if totalEntities === 0}
      <div class="flex flex-col items-center gap-1.5 py-12 text-center">
        <p class="text-[13px] text-[color:var(--color-ink-soft)]">{loc(s.emptyTitle)}</p>
        <p
          class="max-w-md font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
        >
          {loc(s.emptyBody)}
        </p>
      </div>
    {:else}
      <!-- Category chips strip -->
      <div
        class="flex flex-wrap items-center gap-1.5 border-b border-[color:var(--color-rule)] bg-[color:var(--color-bg)] px-4 py-2.5"
      >
        <button
          class="chip chip-all"
          class:active={categoryFilter === 'ALL'}
          onclick={() => (categoryFilter = 'ALL')}
        >
          {loc(s.catAll)} · {totalEntities}
        </button>
        {#each Object.entries(CATEGORY_LABELS) as [cat, label]}
          {@const count = categoryCounts[cat] ?? 0}
          {#if count > 0}
            <button
              class="chip"
              class:active={categoryFilter === cat}
              onclick={() => (categoryFilter = cat as EntityCategory)}
            >
              {loc(label)} · {count}
            </button>
          {/if}
        {/each}
      </div>

      <!-- Mapping table -->
      <div class="overflow-x-auto">
        <table class="w-full text-[12.5px]">
          <thead>
            <tr class="bg-[color:var(--color-bg)] text-[color:var(--color-ink-mute)]">
              <th
                class="px-4 py-2 text-left font-[family-name:var(--font-mono)] text-[10.5px] font-medium tracking-[0.08em] uppercase"
                style="width: 50px;"
              >
                ✓
              </th>
              <th
                class="px-3 py-2 text-left font-[family-name:var(--font-mono)] text-[10.5px] font-medium tracking-[0.08em] uppercase"
                style="width: 110px;"
              >
                {loc(s.colCategory)}
              </th>
              <th
                class="px-3 py-2 text-left font-[family-name:var(--font-mono)] text-[10.5px] font-medium tracking-[0.08em] uppercase"
              >
                {loc(s.colOriginal)}
              </th>
              <th
                class="px-3 py-2 text-left font-[family-name:var(--font-mono)] text-[10.5px] font-medium tracking-[0.08em] uppercase"
              >
                {loc(s.colReplacement)}
              </th>
              <th
                class="px-3 py-2 text-right font-[family-name:var(--font-mono)] text-[10.5px] font-medium tracking-[0.08em] uppercase"
                style="width: 70px;"
              >
                {loc({ de: 'Konf.', en: 'Conf.' })}
              </th>
              <th class="px-3 py-2" style="width: 40px;"></th>
            </tr>
          </thead>
          <tbody>
            {#each filteredEntities as entity (entity.id)}
              {@const isActive = detectionStore.enabledIds.has(entity.id)}
              {@const displayText =
                entity.category === 'secret' ? truncateSecret(entity.text) : entity.text}
              <tr
                class="border-t border-[color:var(--color-rule)] transition-colors hover:bg-[color:var(--color-bg)]"
                class:opacity-40={!isActive}
              >
                <td class="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    class="h-3.5 w-3.5 accent-[color:var(--color-accent)]"
                    onchange={() => detectionStore.toggleEntity(entity.id)}
                    aria-label={tsub(loc(s.toggleAria), { x: entity.text })}
                  />
                </td>
                <td class="px-3 py-2">
                  <span class="ent" data-cat={entity.category}>
                    {loc(CATEGORY_LABELS[entity.category])}
                  </span>
                </td>
                <td
                  class="max-w-xs truncate px-3 py-2 font-[family-name:var(--font-mono)] text-[color:var(--color-ink)]"
                  title={entity.text}
                >
                  {displayText}
                </td>
                <td class="px-3 py-2">
                  {#if isActive}
                    {@const ph = placeholderFor(entity)}
                    {#if ph === '—'}
                      <span
                        class="font-[family-name:var(--font-mono)] text-[color:var(--color-ink-mute)]"
                        >—</span
                      >
                    {:else}
                      <span class="token">{ph}</span>
                    {/if}
                  {:else}
                    <span
                      class="font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)] italic"
                      >{loc({ de: 'ignoriert', en: 'ignored' })}</span
                    >
                  {/if}
                </td>
                <td
                  class="px-3 py-2 text-right font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
                >
                  {Math.round(entity.confidence * 100)}%
                </td>
                <td class="px-3 py-2 text-right">
                  {#if entity.source === 'manual'}
                    <button
                      class="text-[color:var(--color-ink-mute)] transition-colors hover:text-[color:var(--color-danger)]"
                      onclick={() => detectionStore.removeEntity(entity.id)}
                      aria-label={loc(s.removeAria)}
                      title={loc({ de: 'entfernen', en: 'remove' })}
                    >
                      ×
                    </button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
{/if}
