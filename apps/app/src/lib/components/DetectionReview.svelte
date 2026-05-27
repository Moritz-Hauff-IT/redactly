<script lang="ts">
  import type { EntityCategory } from '@de-pii/core/types';
  import { detectionStore, type EntityWithId } from '../stores/detectionStore.svelte.js';

  const CATEGORIES: { cat: EntityCategory; label: string; icon: string }[] = [
    { cat: 'person', label: 'Person', icon: '👤' },
    { cat: 'contact', label: 'Contact', icon: '📧' },
    { cat: 'address', label: 'Address', icon: '📍' },
    { cat: 'financial', label: 'Financial', icon: '💳' },
    { cat: 'secret', label: 'Secret', icon: '🔑' },
    { cat: 'organization', label: 'Organization', icon: '🏢' },
  ];

  // Category badge colors (border-left accent)
  const categoryAccent: Record<EntityCategory, string> = {
    person: 'border-yellow-400',
    contact: 'border-blue-400',
    address: 'border-green-400',
    financial: 'border-orange-400',
    secret: 'border-red-400',
    organization: 'border-purple-400',
  };

  const categoryBg: Record<EntityCategory, string> = {
    person: 'bg-yellow-400/10',
    contact: 'bg-blue-400/10',
    address: 'bg-green-400/10',
    financial: 'bg-orange-400/10',
    secret: 'bg-red-400/10',
    organization: 'bg-purple-400/10',
  };

  // Track which sections are collapsed (default: all expanded)
  let collapsed = $state<Record<EntityCategory, boolean>>({
    person: false,
    contact: false,
    address: false,
    financial: false,
    secret: false,
    organization: false,
  });

  function toggleSection(cat: EntityCategory) {
    collapsed[cat] = !collapsed[cat];
  }

  function entitiesForCategory(cat: EntityCategory): EntityWithId[] {
    return detectionStore.entities.filter((e) => e.category === cat);
  }

  function activeCountForCategory(cat: EntityCategory): number {
    return detectionStore.entities.filter(
      (e) => e.category === cat && detectionStore.enabledIds.has(e.id)
    ).length;
  }

  function truncateSecret(text: string): string {
    if (text.length <= 12) return text;
    return `${text.slice(0, 4)}…${text.slice(-4)}`;
  }

  function formatConfidence(conf: number): string {
    return `${Math.round(conf * 100)}%`;
  }

  const totalEntities = $derived(detectionStore.entities.length);
  const totalActive = $derived(detectionStore.activeEntities.length);
</script>

<div class="rounded-lg border border-slate-800 bg-slate-900/60">
  <div class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
    <h2 class="text-sm font-semibold text-slate-200">Detection Review</h2>
    {#if totalEntities > 0}
      <span class="text-xs text-slate-500">
        {totalActive} active / {totalEntities} detected
      </span>
    {/if}
  </div>

  {#if totalEntities === 0}
    <!-- Empty state -->
    <div class="flex flex-col items-center gap-2 py-10 text-center">
      <svg
        class="h-8 w-8 text-slate-600"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
          clip-rule="evenodd"
        />
      </svg>
      <p class="text-sm text-slate-400">No PII detected</p>
      <p class="text-xs text-slate-600">
        Type or upload text to analyze for personally identifiable information.
      </p>
    </div>
  {:else}
    <div class="divide-y divide-slate-800">
      {#each CATEGORIES as { cat, label, icon }}
        {@const catEntities = entitiesForCategory(cat)}
        {@const activeCount = activeCountForCategory(cat)}
        {@const total = catEntities.length}
        {#if total > 0}
          <div class="border-l-2 {categoryAccent[cat]}">
            <!-- Section header -->
            <div
              class="flex w-full items-center justify-between px-4 py-2.5 transition-colors hover:bg-slate-800/50"
              role="group"
            >
              <button
                class="flex flex-1 items-center gap-2 text-left"
                onclick={() => toggleSection(cat)}
                aria-expanded={!collapsed[cat]}
                aria-controls="section-{cat}"
              >
                <span class="text-base" aria-hidden="true">{icon}</span>
                <span class="text-sm font-medium text-slate-200">{label}</span>
                <span class="rounded-full {categoryBg[cat]} px-2 py-0.5 text-xs text-slate-300">
                  {activeCount} active / {total} total
                </span>
                <svg
                  class="ml-1 h-4 w-4 text-slate-500 transition-transform {collapsed[cat]
                    ? ''
                    : 'rotate-180'}"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <div class="flex items-center gap-2">
                {#if activeCount < total}
                  <button
                    class="rounded px-2 py-0.5 text-xs text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
                    onclick={() => detectionStore.enableAllCategory(cat)}
                    aria-label="Enable all {label} entities"
                  >
                    Enable all
                  </button>
                {/if}
                {#if activeCount > 0}
                  <button
                    class="rounded px-2 py-0.5 text-xs text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
                    onclick={() => detectionStore.disableAllCategory(cat)}
                    aria-label="Disable all {label} entities"
                  >
                    Disable all
                  </button>
                {/if}
              </div>
            </div>

            <!-- Entity list -->
            {#if !collapsed[cat]}
              <ul id="section-{cat}" class="px-4 pb-2" role="list">
                {#each catEntities as entity (entity.id)}
                  {@const isActive = detectionStore.enabledIds.has(entity.id)}
                  {@const displayText =
                    entity.category === 'secret' ? truncateSecret(entity.text) : entity.text}
                  <li
                    class="flex items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-slate-800/40"
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      class="h-3.5 w-3.5 flex-shrink-0 rounded border-slate-600 bg-slate-700 accent-blue-500"
                      onchange={() => detectionStore.toggleEntity(entity.id)}
                      aria-label="Toggle {entity.type}: {entity.text}"
                    />
                    <span
                      class="flex-1 truncate font-mono text-xs {isActive
                        ? 'text-slate-100'
                        : 'text-slate-500 line-through'}"
                      title={entity.text}
                    >
                      {displayText}
                    </span>
                    <span
                      class="flex-shrink-0 rounded bg-slate-700/60 px-1.5 py-0.5 text-xs text-slate-400"
                    >
                      {entity.type}
                    </span>
                    <span class="flex-shrink-0 text-xs text-slate-600">
                      {formatConfidence(entity.confidence)}
                    </span>
                    {#if entity.source === 'manual'}
                      <button
                        class="flex-shrink-0 rounded p-0.5 text-slate-500 transition-colors hover:bg-slate-700 hover:text-red-400"
                        onclick={() => detectionStore.removeEntity(entity.id)}
                        aria-label="Remove manual entity {entity.text}"
                      >
                        <svg
                          class="h-3.5 w-3.5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      </button>
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>
