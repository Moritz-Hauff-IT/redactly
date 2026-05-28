<script lang="ts">
  import { untrack } from 'svelte';
  import InputPane from '$lib/components/InputPane.svelte';
  import MaskedPane from '$lib/components/MaskedPane.svelte';
  import DetectionReview from '$lib/components/DetectionReview.svelte';
  import RestorePane from '$lib/components/RestorePane.svelte';
  import { analyze } from '$lib/core/pipeline.js';
  import { maskText } from '$lib/core/maskingService.js';
  import { inputStore } from '$lib/stores/inputStore.svelte.js';
  import { detectionStore } from '$lib/stores/detectionStore.svelte.js';

  type Tab = 'redact' | 'restore';

  let maskedText = $state('');
  let isAnalyzing = $state(false);
  let hasMasked = $state(false);
  let activeTab = $state<Tab>('redact');

  async function handleMaskClick() {
    const text = inputStore.text;
    if (!text.trim()) {
      detectionStore.clear();
      maskedText = '';
      hasMasked = false;
      return;
    }

    isAnalyzing = true;
    try {
      const entities = await analyze(text);
      detectionStore.setEntities(entities);
      hasMasked = true;
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      isAnalyzing = false;
    }
  }

  function handleInputChange() {
    if (hasMasked) {
      detectionStore.clear();
      maskedText = '';
      hasMasked = false;
    }
  }

  $effect(() => {
    const active = detectionStore.activeEntities;
    if (active.length === 0 && !hasMasked) return;
    const text = untrack(() => inputStore.text);
    if (!text.trim()) {
      maskedText = '';
      return;
    }
    const result = maskText(text);
    maskedText = result.maskedText;
  });

  // Keyboard shortcut: Cmd/Ctrl + Enter triggers mask
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && activeTab === 'redact') {
      e.preventDefault();
      handleMaskClick();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex flex-col gap-5">
  <!-- Top tabs: redact / restore -->
  <div
    class="-mb-px flex gap-1 border-b border-[color:var(--color-rule)]"
    role="tablist"
    aria-label="Workspace mode"
  >
    <button
      class="tab-btn"
      class:active={activeTab === 'redact'}
      onclick={() => (activeTab = 'redact')}
      role="tab"
      aria-selected={activeTab === 'redact'}
    >
      redact
    </button>
    <button
      class="tab-btn"
      class:active={activeTab === 'restore'}
      onclick={() => (activeTab = 'restore')}
      role="tab"
      aria-selected={activeTab === 'restore'}
    >
      ↺ restore
    </button>
  </div>

  {#if activeTab === 'redact'}
    <!-- Two panes: input | output -->
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <InputPane onchange={handleInputChange} onmask={handleMaskClick} {isAnalyzing} />
      <MaskedPane {maskedText} />
    </div>

    <!-- Detection review — mapping table below panes -->
    <DetectionReview />
  {:else}
    <RestorePane />
  {/if}
</div>

<style>
  .tab-btn {
    font-family: var(--font-mono);
    font-size: 12px;
    background: transparent;
    border: 0;
    padding: 9px 18px 11px;
    cursor: pointer;
    color: var(--color-ink-mute);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    letter-spacing: 0.02em;
    transition:
      color 0.12s,
      border-color 0.12s;
  }
  .tab-btn:hover {
    color: var(--color-ink-soft);
  }
  .tab-btn.active {
    color: var(--color-ink);
    border-bottom-color: var(--color-accent);
  }
</style>
