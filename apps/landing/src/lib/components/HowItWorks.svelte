<script lang="ts">
  import CtaButton from './CtaButton.svelte';

  const steps = [
    {
      number: '1',
      title: 'Text eingeben oder Datei hochladen',
      description:
        'Füge Text ein oder lade eine Datei hoch (.txt, .md, .eml, .pdf, .docx). de-pii erkennt automatisch PII und Secrets im Browser.',
      detail: 'Browser erkennt PII lokal',
    },
    {
      number: '2',
      title: 'Maskierten Text kopieren',
      description:
        'Der maskierte Text wird sofort angezeigt. Echte Werte werden durch Platzhalter ersetzt (z.B. [NAME_1], [EMAIL_1]). Kopiere ihn in ChatGPT, Claude oder ein anderes LLM.',
      detail: 'Kopieren → an ChatGPT / Claude senden',
    },
    {
      number: '3',
      title: 'Antwort einfügen → Originale restaurieren',
      description:
        'Füge die LLM-Antwort zurück in de-pii ein. Die Platzhalter werden lokal durch deine Originalwerte ersetzt — das Mapping verlässt nie deinen Browser.',
      detail: 'Lokale Restaurierung im Browser',
    },
  ];
</script>

<section class="bg-white py-20">
  <div class="mx-auto max-w-6xl px-4 sm:px-6">
    <div class="text-center">
      <h2 class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Wie es funktioniert
      </h2>
      <p class="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
        Drei Schritte — vollständig im Browser, ohne Server-Roundtrip.
      </p>
    </div>

    <div class="mt-16 space-y-8 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8">
      {#each steps as step, i}
        <div class="relative flex flex-col">
          <!-- Connector line (desktop) -->
          {#if i < steps.length - 1}
            <div
              class="absolute top-8 left-full hidden w-full items-center lg:flex"
              aria-hidden="true"
            >
              <div class="h-0.5 w-full bg-slate-200"></div>
              <svg
                class="h-4 w-4 flex-shrink-0 text-slate-300"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 0l8 8-8 8V0z" />
              </svg>
            </div>
          {/if}

          <div class="flex items-start gap-4 lg:flex-col lg:items-center lg:text-center">
            <!-- Step number -->
            <div
              class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-teal-600 text-2xl font-bold text-white shadow-md"
            >
              {step.number}
            </div>

            <div class="lg:mt-4">
              <h3 class="text-lg font-semibold text-slate-900">{step.title}</h3>
              <p class="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
              <!-- Detail badge -->
              <div
                class="mt-3 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500"
              >
                {step.detail}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <div class="mt-16 text-center">
      <CtaButton size="lg" label="Jetzt ausprobieren →" />
    </div>
  </div>
</section>
