<script lang="ts">
</script>

<div class="mx-auto max-w-2xl space-y-4">
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
</div>
