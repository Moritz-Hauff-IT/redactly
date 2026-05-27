<script lang="ts">
  import type { EntityCategory } from '@de-pii/core/types';
  import type { EntityWithId } from '../stores/detectionStore.svelte.js';
  import { detectionStore } from '../stores/detectionStore.svelte.js';

  interface Props {
    text: string;
    entities: EntityWithId[];
    onchange?: (value: string) => void;
    oninput?: (value: string) => void;
  }

  const { text, entities, onchange, oninput }: Props = $props();

  // Category color classes: [bg active, bg disabled, text]
  const categoryColors: Record<EntityCategory, { bg: string; bgDisabled: string }> = {
    person: {
      bg: 'bg-yellow-300/40 text-yellow-100',
      bgDisabled: 'bg-yellow-300/10 text-yellow-500 line-through',
    },
    contact: {
      bg: 'bg-blue-300/40 text-blue-100',
      bgDisabled: 'bg-blue-300/10 text-blue-500 line-through',
    },
    address: {
      bg: 'bg-green-300/40 text-green-100',
      bgDisabled: 'bg-green-300/10 text-green-500 line-through',
    },
    financial: {
      bg: 'bg-orange-300/40 text-orange-100',
      bgDisabled: 'bg-orange-300/10 text-orange-500 line-through',
    },
    secret: {
      bg: 'bg-red-400/40 text-red-100',
      bgDisabled: 'bg-red-400/10 text-red-400 line-through',
    },
    organization: {
      bg: 'bg-purple-300/40 text-purple-100',
      bgDisabled: 'bg-purple-300/10 text-purple-500 line-through',
    },
  };

  // Build highlighted HTML from text + entities (sorted, non-overlapping)
  interface Segment {
    text: string;
    entity?: EntityWithId;
  }

  function buildSegments(rawText: string, ents: EntityWithId[]): Segment[] {
    if (!ents.length) return [{ text: rawText }];

    // Sort by start
    const sorted = [...ents].sort((a, b) => a.start - b.start);

    const segments: Segment[] = [];
    let cursor = 0;

    for (const e of sorted) {
      if (e.start > cursor) {
        segments.push({ text: rawText.substring(cursor, e.start) });
      }
      if (e.end > cursor) {
        segments.push({
          text: rawText.substring(Math.max(e.start, cursor), e.end),
          entity: e,
        });
        cursor = e.end;
      }
    }

    if (cursor < rawText.length) {
      segments.push({ text: rawText.substring(cursor) });
    }

    return segments;
  }

  const segments = $derived(buildSegments(text, entities));

  // Text escape for safe rendering
  function escapeHtml(s: string): string {
    return (
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        // Preserve whitespace exactly as in textarea
        .replace(/ /g, '&nbsp;')
        .replace(/\n/g, '<br>')
    );
  }

  // Scroll sync between textarea and overlay
  let overlayEl = $state<HTMLDivElement | null>(null);
  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  function syncScroll() {
    if (overlayEl && textareaEl) {
      overlayEl.scrollTop = textareaEl.scrollTop;
      overlayEl.scrollLeft = textareaEl.scrollLeft;
    }
  }

  function handleInput(e: Event) {
    const target = e.currentTarget as HTMLTextAreaElement;
    oninput?.(target.value);
    onchange?.(target.value);
    syncScroll();
  }

  function handleChange(e: Event) {
    const target = e.currentTarget as HTMLTextAreaElement;
    onchange?.(target.value);
  }

  // Selection popover for manual add
  interface SelectionInfo {
    start: number;
    end: number;
    text: string;
    top: number;
    left: number;
  }

  let selectionInfo = $state<SelectionInfo | null>(null);
  let containerEl = $state<HTMLDivElement | null>(null);

  function handleMouseup() {
    if (!textareaEl) return;
    const { selectionStart, selectionEnd } = textareaEl;
    if (selectionStart === selectionEnd) {
      selectionInfo = null;
      return;
    }

    // Get position for popover
    const rect = textareaEl.getBoundingClientRect();
    const containerRect = containerEl?.getBoundingClientRect() ?? rect;

    selectionInfo = {
      start: selectionStart,
      end: selectionEnd,
      text: text.substring(selectionStart, selectionEnd),
      top: rect.top - containerRect.top,
      left: rect.left - containerRect.left + rect.width / 2,
    };
  }

  function addManualEntity(category: EntityCategory) {
    if (!selectionInfo) return;
    const typeMap: Record<EntityCategory, string> = {
      person: 'PERSON',
      contact: 'EMAIL',
      address: 'LOCATION',
      financial: 'IBAN',
      secret: 'GENERIC_SECRET',
      organization: 'ORG',
    };
    detectionStore.addEntity({
      start: selectionInfo.start,
      end: selectionInfo.end,
      text: selectionInfo.text,
      category,
      type: typeMap[category] as import('@de-pii/core/types').EntityType,
      confidence: 1.0,
      source: 'manual',
    });
    selectionInfo = null;
  }

  const categoryLabels: Record<EntityCategory, string> = {
    person: 'Person',
    contact: 'Contact',
    address: 'Address',
    financial: 'Financial',
    secret: 'Secret',
    organization: 'Organization',
  };
</script>

<div bind:this={containerEl} class="relative flex-1">
  <!-- Highlight overlay (pointer-events-none, synced scroll) -->
  <div
    bind:this={overlayEl}
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 overflow-hidden rounded-md border border-transparent p-3 font-mono text-sm text-transparent"
    style="white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word;"
  >
    {#each segments as seg}
      {#if seg.entity}
        {@const colors = categoryColors[seg.entity.category]}
        {@const isActive = detectionStore.enabledIds.has(seg.entity.id)}
        <mark
          class="rounded-sm {isActive ? colors.bg : colors.bgDisabled} pointer-events-none"
          role="mark"
          aria-label="{seg.entity.category}: {seg.entity.type}"
          data-cat={seg.entity.category}>{seg.text}</mark
        >
      {:else}
        {seg.text}
      {/if}
    {/each}
  </div>

  <!-- Editable textarea on top -->
  <textarea
    bind:this={textareaEl}
    data-testid="input-textarea"
    class="relative min-h-64 w-full flex-1 resize-none rounded-md border border-slate-700 bg-transparent p-3 font-mono text-sm text-slate-100 placeholder-slate-600 focus:border-slate-500 focus:outline-none"
    style="caret-color: #e2e8f0;"
    placeholder="Paste or type text here to detect and mask PII..."
    value={text}
    oninput={handleInput}
    onchange={handleChange}
    onscroll={syncScroll}
    onmouseup={handleMouseup}
    onkeyup={handleMouseup}
  ></textarea>

  <!-- Selection popover for manual add -->
  {#if selectionInfo}
    <div
      class="absolute z-20 flex gap-1 rounded-lg border border-slate-600 bg-slate-800 p-2 shadow-xl"
      style="top: {selectionInfo.top -
        52}px; left: {selectionInfo.left}px; transform: translateX(-50%);"
    >
      <span class="self-center pr-1 text-xs text-slate-400">Add as:</span>
      {#each Object.entries(categoryLabels) as [cat, label]}
        <button
          class="rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-slate-700"
          onclick={() => addManualEntity(cat as EntityCategory)}
        >
          {label}
        </button>
      {/each}
      <button
        class="ml-1 rounded px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-700"
        onclick={() => (selectionInfo = null)}
        aria-label="Close popover"
      >
        ✕
      </button>
    </div>
  {/if}
</div>
