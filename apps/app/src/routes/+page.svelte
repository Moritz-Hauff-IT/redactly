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

  let maskedText = $state('');
  let isAnalyzing = $state(false);
  let hasMasked = $state(false);

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
      // Effect below picks up the entity change and writes maskedText.
      hasMasked = true;
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      isAnalyzing = false;
    }
  }

  function handleInputChange() {
    // User has edited input — previous detection is stale.
    if (hasMasked) {
      detectionStore.clear();
      maskedText = '';
      hasMasked = false;
    }
  }

  // Re-mask whenever the user toggles entities (after the initial click).
  // Reads activeEntities (tracked) and pulls text untracked so the effect
  // only fires on entity toggle, not on every character.
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
</script>

<div class="flex flex-col gap-6">
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <InputPane onchange={handleInputChange} onmask={handleMaskClick} {isAnalyzing} />
    <MaskedPane {maskedText} />
  </div>

  <!-- Detection Review — full width below the two-column workspace -->
  <DetectionReview />

  <!-- Restore LLM response -->
  <RestorePane />
</div>
