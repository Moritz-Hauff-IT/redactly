<script lang="ts">
  import CtaButton from './CtaButton.svelte';
</script>

<section class="bg-white py-20 sm:py-28">
  <div class="mx-auto max-w-4xl px-4 text-center sm:px-6">
    <!-- Badge -->
    <div
      class="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700"
    >
      <span class="h-2 w-2 rounded-full bg-teal-500"></span>
      100 % lokal &middot; kein Server &middot; Open Source
    </div>

    <!-- Headline -->
    <h1 class="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
      Maskiere PII und Secrets,<br class="hidden sm:block" />
      bevor sie deinen Browser verlassen.
    </h1>

    <!-- Sub-tagline -->
    <p class="mx-auto mt-6 max-w-2xl text-xl text-slate-600">
      de-pii erkennt persönliche Daten und Geheimnisse in deinen Texten und Dateien — vollständig im
      Browser. Kein Server. Keine Cloud. Reversibel.
    </p>

    <!-- CTAs -->
    <div class="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <CtaButton size="lg" />
      <a
        href="/docs"
        class="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-8 py-4 text-lg font-semibold text-slate-700 transition-colors hover:border-teal-400 hover:text-teal-700"
      >
        Dokumentation
      </a>
    </div>

    <!-- Trust bar -->
    <div class="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
      <span class="flex items-center gap-1.5">
        <svg
          class="h-4 w-4 text-teal-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clip-rule="evenodd"
          />
        </svg>
        Keine Datenübertragung
      </span>
      <span class="flex items-center gap-1.5">
        <svg
          class="h-4 w-4 text-teal-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clip-rule="evenodd"
          />
        </svg>
        MIT lizenziert
      </span>
      <span class="flex items-center gap-1.5">
        <svg
          class="h-4 w-4 text-teal-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clip-rule="evenodd"
          />
        </svg>
        Reversibles Masking
      </span>
      <span class="flex items-center gap-1.5">
        <svg
          class="h-4 w-4 text-teal-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clip-rule="evenodd"
          />
        </svg>
        Kein Tracking
      </span>
    </div>
  </div>
</section>
