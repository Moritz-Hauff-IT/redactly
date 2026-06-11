<script lang="ts">
  import type { EntityCategory } from '@redactly/core/types';
  import type { EntityWithId } from '../stores/detectionStore.svelte.js';
  import { detectionStore } from '../stores/detectionStore.svelte.js';
  import { loc } from '$lib/i18n/locale.svelte.js';

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
    identity: {
      bg: 'bg-amber-300/40 text-amber-100',
      bgDisabled: 'bg-amber-300/10 text-amber-500 line-through',
    },
    other: {
      bg: 'bg-pink-300/40 text-pink-100',
      bgDisabled: 'bg-pink-300/10 text-pink-500 line-through',
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

  /** Escape HTML special chars. Whitespace is preserved by the
   * white-space: pre-wrap on the overlay div — we do NOT replace spaces
   * or newlines, because the textarea also uses pre-wrap and any
   * substitution here would cause character-by-character drift. */
  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Build the overlay HTML as a single string. Doing this in script
   * avoids Svelte template whitespace artifacts (template indentation
   * gets rendered as text under white-space: pre-wrap). */
  function buildOverlayHtml(segs: Segment[]): string {
    let html = '';
    for (const seg of segs) {
      const safe = escapeHtml(seg.text);
      if (seg.entity) {
        const isActive = detectionStore.enabledIds.has(seg.entity.id);
        const cls = isActive ? 'ent' : 'ent disabled';
        html += `<span class="${cls}" data-cat="${seg.entity.category}">${safe}</span>`;
      } else {
        html += safe;
      }
    }
    // Trailing newline trick: textareas reserve space for the cursor on the
    // line after the final character; a trailing newline in our overlay
    // keeps line counts aligned in case the user ends input with \n.
    return html;
  }

  const overlayHtml = $derived(buildOverlayHtml(segments));

  // Scroll sync between textarea and overlay.
  //
  // Earlier versions set `overlayEl.scrollTop = textareaEl.scrollTop`, but on
  // `overflow: hidden` containers the browser silently subpixel-rounds the
  // value, causing the overlay's content to drift below the textarea content
  // as you scroll (visible as highlight rectangles appearing one line below
  // the actual entity). Switched to a translate3d on an INNER wrapper:
  // pixel-perfect, GPU-composited, and immune to scrollTop quirks.
  let overlayInnerEl = $state<HTMLDivElement | null>(null);
  let textareaEl = $state<HTMLTextAreaElement | null>(null);

  function syncScroll() {
    if (overlayInnerEl && textareaEl) {
      const x = textareaEl.scrollLeft;
      const y = textareaEl.scrollTop;
      overlayInnerEl.style.transform = `translate3d(${-x}px, ${-y}px, 0)`;
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
      identity: 'INTERNAL_REF',
      secret: 'GENERIC_SECRET',
      organization: 'ORG',
      other: 'OTHER_PII',
    };
    detectionStore.addEntity({
      start: selectionInfo.start,
      end: selectionInfo.end,
      text: selectionInfo.text,
      category,
      type: typeMap[category] as import('@redactly/core/types').EntityType,
      confidence: 1.0,
      source: 'manual',
    });
    selectionInfo = null;
  }

  const categoryLabels: Record<EntityCategory, { de: string; en: string }> = {
    person: { de: 'Person', en: 'Person' },
    contact: { de: 'Kontakt', en: 'Contact' },
    address: { de: 'Adresse', en: 'Address' },
    financial: { de: 'Finanz', en: 'Finance' },
    identity: { de: 'ID', en: 'ID' },
    secret: { de: 'Secret', en: 'Secret' },
    organization: { de: 'Firma', en: 'Org' },
    other: { de: 'Sonstiges', en: 'Other' },
  };

  const markAsLabel = $derived(loc({ de: '+ markieren als', en: '+ mark as' }));
  const placeholderText = $derived(
    loc({
      de: 'Text hier einfügen — wird lokal verarbeitet, verlässt deinen Browser nicht.\n\n⌘↵ zum Maskieren',
      en: 'Paste text here — processed locally, never leaves your browser.\n\n⌘↵ to mask',
    })
  );
  const closeLabel = $derived(loc({ de: 'Schließen', en: 'Close' }));
</script>

<div bind:this={containerEl} class="relative min-h-0 flex-1">
  <!-- Highlight overlay (pointer-events-none, synced via transform on inner) -->
  <div
    aria-hidden="true"
    class="overlay-highlights pointer-events-none absolute inset-0 overflow-hidden"
  >
    <div
      bind:this={overlayInnerEl}
      class="px-4 py-3.5 font-[family-name:var(--font-mono)] text-[13px] leading-[1.65] text-transparent"
      style="white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word; transform: translate3d(0, 0, 0); will-change: transform;"
    >
      <!-- Rendered as pre-built HTML so no Svelte template whitespace leaks
           into the overlay. eslint-disable required — the source is trusted
           (built from escapeHtml() in script). -->
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html overlayHtml}
    </div>
  </div>

  <!-- Editable textarea on top -->
  <textarea
    bind:this={textareaEl}
    data-testid="input-textarea"
    class="relative h-full min-h-64 w-full resize-none border-0 bg-transparent px-4 py-3.5 font-[family-name:var(--font-mono)] text-[13px] leading-[1.65] text-[color:var(--color-ink)] placeholder-[color:var(--color-ink-mute)] focus:outline-none"
    style="caret-color: var(--color-ink);"
    placeholder={placeholderText}
    spellcheck="false"
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
      class="absolute z-20 flex gap-1 rounded-md border border-[color:var(--color-rule-strong)] bg-[color:var(--color-bg-elev)] p-1.5 shadow-lg"
      style="top: {selectionInfo.top -
        52}px; left: {selectionInfo.left}px; transform: translateX(-50%);"
    >
      <span
        class="self-center pr-1.5 pl-1 font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.04em] text-[color:var(--color-ink-mute)] uppercase"
        >{markAsLabel}</span
      >
      {#each Object.entries(categoryLabels) as [cat, label]}
        <button
          class="rounded px-2 py-1 text-[11.5px] font-medium text-[color:var(--color-ink-soft)] transition-colors hover:bg-[color:var(--color-bg-sunk)] hover:text-[color:var(--color-ink)]"
          onclick={() => addManualEntity(cat as EntityCategory)}
        >
          {loc(label)}
        </button>
      {/each}
      <button
        class="ml-0.5 rounded px-1.5 py-1 text-[11px] text-[color:var(--color-ink-mute)] transition-colors hover:bg-[color:var(--color-bg-sunk)] hover:text-[color:var(--color-ink)]"
        onclick={() => (selectionInfo = null)}
        aria-label={closeLabel}
      >
        ✕
      </button>
    </div>
  {/if}
</div>
