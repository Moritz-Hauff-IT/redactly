<script lang="ts">
  import { untrack } from 'svelte';
  import InputPane from '$lib/components/InputPane.svelte';
  import MaskedPane from '$lib/components/MaskedPane.svelte';
  import EngineStatus from '$lib/components/EngineStatus.svelte';
  import DetectionReview from '$lib/components/DetectionReview.svelte';
  import RestorePane from '$lib/components/RestorePane.svelte';
  import { analyze } from '$lib/core/pipeline.js';
  import { maskText } from '$lib/core/maskingService.js';
  import { inputStore } from '$lib/stores/inputStore.svelte.js';
  import { detectionStore } from '$lib/stores/detectionStore.svelte.js';

  let maskedText = $state('');
  let analyzeTimer: ReturnType<typeof setTimeout> | null = null;

  async function runAnalysis() {
    const text = inputStore.text;
    if (!text.trim()) {
      detectionStore.clear();
      maskedText = '';
      return;
    }

    try {
      const entities = await analyze(text);
      detectionStore.setEntities(entities);
      // Don't mask here — the $effect below picks up the entity change and masks once.
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  }

  function handleInputChange() {
    if (analyzeTimer !== null) clearTimeout(analyzeTimer);
    analyzeTimer = setTimeout(() => {
      runAnalysis();
    }, 300);
  }

  // Single mask-on-entity-change effect. Reads activeEntities (tracked) and
  // pulls text untracked so character-by-character typing doesn't mask before
  // the debounced analyze has refreshed entities.
  $effect(() => {
    const _active = detectionStore.activeEntities;
    const text = untrack(() => inputStore.text);
    if (!text.trim()) {
      maskedText = '';
      return;
    }
    const result = maskText(text);
    maskedText = result.maskedText;
  });
</script>

<div class="flex flex-col gap-6">
  <EngineStatus />

  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <InputPane onchange={handleInputChange} />
    <MaskedPane {maskedText} />
  </div>

  <!-- Detection Review — full width below the two-column workspace -->
  <DetectionReview />

  <!-- Restore LLM response -->
  <RestorePane />
</div>
