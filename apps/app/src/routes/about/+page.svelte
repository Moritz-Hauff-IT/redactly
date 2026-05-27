<script lang="ts">
</script>

<div class="mx-auto max-w-2xl space-y-6">
  <h1 class="text-2xl font-bold text-white">About de-pii</h1>
  <p class="text-slate-300">
    de-pii is a privacy-first PII masking tool that runs entirely in your browser. No text you enter
    ever leaves your device — there are no server-side API calls, no analytics, and no telemetry of
    any kind.
  </p>
  <p class="text-slate-300">
    Detection is powered by a regex engine covering common PII patterns (emails, phone numbers,
    IBANs, API keys, and more), with optional on-device NER (Named Entity Recognition) for detecting
    names, organisations, and locations.
  </p>
  <p class="text-slate-300">
    Masked text uses stable placeholders (e.g. <code
      class="rounded bg-slate-800 px-1 font-mono text-sm">[EMAIL_1]</code
    >) that can be restored to the original values at any time using the stored mapping — which also
    never leaves your browser.
  </p>

  <hr class="border-slate-800" />

  <section class="space-y-3">
    <h2 class="text-lg font-semibold text-white">
      Why we ask your permission before downloading the NER model
    </h2>
    <p class="text-slate-300">
      The optional Named Entity Recognition feature uses a multilingual BERT model (<code
        class="rounded bg-slate-800 px-1 font-mono text-sm"
        >Xenova/bert-base-multilingual-cased-ner-hrl</code
      >) to detect names, organisations, and locations that don't match a fixed pattern. This model
      is approximately 140 MB in size.
    </p>
    <p class="text-slate-300">
      Because that is a significant one-time download, we don't fetch it automatically on first
      visit. Instead, NER must be explicitly enabled in <a
        href="/settings"
        class="text-violet-400 underline hover:text-violet-300">Settings</a
      >. Once downloaded, your browser caches the model locally — subsequent page loads reuse the
      cached copy without any network traffic.
    </p>
    <p class="text-slate-300">
      Crucially, <strong class="text-white">none of your text ever leaves your browser</strong>. The
      NER model runs entirely in-browser via WebAssembly (ONNX Runtime). The only external request
      is the initial model download from HuggingFace — and that download contains no information
      about your content whatsoever.
    </p>
  </section>
</div>
