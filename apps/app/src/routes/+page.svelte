<script lang="ts">
  import InputPane from '$lib/components/InputPane.svelte';
  import MaskedPane from '$lib/components/MaskedPane.svelte';
  import EngineStatus from '$lib/components/EngineStatus.svelte';
  import DetectionReview from '$lib/components/DetectionReview.svelte';
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
      // Mask uses activeEntities from store
      const result = maskText(text);
      maskedText = result.maskedText;
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

  // When active entities change (user toggles), re-run masking without re-analysis
  $effect(() => {
    // Access activeEntities to track changes
    const _active = detectionStore.activeEntities;
    const text = inputStore.text;
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

  <!-- RestorePane placeholder — wired in task 8 -->
  <div class="rounded-md border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-500">
    Restore panel coming in task 8.
  </div>
</div>
