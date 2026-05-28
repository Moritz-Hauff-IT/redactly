<script lang="ts">
  import type { EntityCategory } from '@de-pii/core/types';
  import { detectionStore, type EntityWithId } from '../stores/detectionStore.svelte.js';

  const CATEGORY_LABELS: Record<EntityCategory, string> = {
    person: 'Person',
    contact: 'Kontakt',
    address: 'Adresse',
    financial: 'Finanz',
    secret: 'Secret',
    organization: 'Firma',
  };

  function truncateSecret(text: string): string {
    if (text.length <= 16) return text;
    return `${text.slice(0, 6)}…${text.slice(-4)}`;
  }

  function placeholderFor(entity: EntityWithId): string {
    const prefixMap: Record<EntityCategory, string> = {
      person: 'PERSON',
      contact: entity.type === 'EMAIL' ? 'EMAIL' : entity.type === 'PHONE' ? 'PHONE' : 'URL',
      address: 'LOC',
      financial: entity.type === 'IBAN' ? 'IBAN' : entity.type === 'CREDIT_CARD' ? 'CARD' : 'TAX',
      secret: 'SECRET',
      organization: 'ORG',
    };
    return `[${prefixMap[entity.category]}_n]`;
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

<section class="rounded-lg border border-[color:var(--color-rule)] bg-[color:var(--color-bg-elev)]">
  <header
    class="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-rule)] px-4 py-3"
  >
    <div class="flex items-baseline gap-3">
      <h2
        class="font-[family-name:var(--font-serif)] text-[16px] leading-none font-medium text-[color:var(--color-ink)]"
      >
        Mapping
      </h2>
      {#if totalEntities > 0}
        <span
          class="font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
        >
          {totalActive} aktiv / {totalEntities} erkannt
        </span>
      {/if}
    </div>
    {#if totalEntities > 0}
      <div class="flex flex-wrap items-center gap-1.5">
        <!-- Status filter chips -->
        <button class="chip" class:active={filter === 'all'} onclick={() => (filter = 'all')}
          >alle</button
        >
        <button class="chip" class:active={filter === 'on'} onclick={() => (filter = 'on')}
          >aktiv</button
        >
        <button class="chip" class:active={filter === 'off'} onclick={() => (filter = 'off')}
          >ignoriert</button
        >
      </div>
    {/if}
  </header>

  {#if totalEntities === 0}
    <div class="flex flex-col items-center gap-1.5 py-12 text-center">
      <p class="text-[13px] text-[color:var(--color-ink-soft)]">Noch keine PII erkannt</p>
      <p
        class="max-w-md font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-ink-mute)]"
      >
        Tippe oder lade Text und klick „Maskieren". Was hier nicht auftaucht, wurde nicht erkannt —
        prüf ggf. NER oder WebLLM in den Einstellungen.
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
        alles · {totalEntities}
      </button>
      {#each Object.entries(CATEGORY_LABELS) as [cat, label]}
        {@const count = categoryCounts[cat] ?? 0}
        {#if count > 0}
          <button
            class="chip"
            class:active={categoryFilter === cat}
            onclick={() => (categoryFilter = cat as EntityCategory)}
          >
            {label} · {count}
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
              Kategorie
            </th>
            <th
              class="px-3 py-2 text-left font-[family-name:var(--font-mono)] text-[10.5px] font-medium tracking-[0.08em] uppercase"
            >
              Original
            </th>
            <th
              class="px-3 py-2 text-left font-[family-name:var(--font-mono)] text-[10.5px] font-medium tracking-[0.08em] uppercase"
            >
              Ersatz
            </th>
            <th
              class="px-3 py-2 text-right font-[family-name:var(--font-mono)] text-[10.5px] font-medium tracking-[0.08em] uppercase"
              style="width: 70px;"
            >
              Konf.
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
                  aria-label="Toggle {entity.text}"
                />
              </td>
              <td class="px-3 py-2">
                <span class="ent" data-cat={entity.category}>
                  {CATEGORY_LABELS[entity.category]}
                </span>
              </td>
              <td
                class="max-w-xs truncate px-3 py-2 font-[family-name:var(--font-mono)] text-[color:var(--color-ink)]"
                title={entity.text}
              >
                {displayText}
              </td>
              <td class="px-3 py-2">
                <span class="token">{placeholderFor(entity)}</span>
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
                    aria-label="Manuellen Eintrag entfernen"
                    title="entfernen"
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
