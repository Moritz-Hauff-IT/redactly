<script lang="ts">
  import CtaButton from './CtaButton.svelte';

  const steps = [
    {
      n: '01',
      title: 'Du fügst ein, was sensibel ist.',
      body: 'Email-Entwurf, Code-Snippet, Log-Auszug, ein PDF mit Vertragstext. Redactly liest mit — aber nur im Browser. Erkennt automatisch, was nach Person, Email, IBAN, Token oder Geheimnis aussieht.',
      meta: 'lokal — keine Anfrage verlässt den Tab',
    },
    {
      n: '02',
      title: 'Du übernimmst die maskierte Version ins LLM.',
      body: 'Aus „Martin Müller" wird [PERSON_1], aus deinem AWS-Key wird [SECRET_3]. Den maskierten Text kopierst du in ChatGPT oder Claude. Das Modell sieht Platzhalter — und nur die.',
      meta: 'das LLM sieht keine echten Werte',
    },
    {
      n: '03',
      title: 'Die Antwort kommt zurück — und wird wieder lesbar.',
      body: 'Du fügst die LLM-Antwort in Redactly ein. Die Platzhalter werden mit deinen echten Werten ersetzt, weil das Mapping lokal beim Maskieren entstanden ist und deinen Browser nie verlassen hat.',
      meta: 'Restauration vollständig clientseitig',
    },
  ];
</script>

<section
  class="border-t border-[color:var(--color-rule)] bg-[color:var(--color-paper-deep)]/30 py-24 sm:py-32"
>
  <div class="mx-auto max-w-6xl px-5 sm:px-8">
    <header class="mb-20 grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div class="lg:col-span-3">
        <span class="label-caps">§ 3 — Ablauf</span>
      </div>
      <div class="lg:col-span-9">
        <h2
          class="font-[family-name:var(--font-display)] text-[2.25rem] leading-[1.05] italic tracking-tight text-[color:var(--color-ink)] sm:text-[3rem]"
        >
          Drei Bewegungen. Keine davon verlässt deinen Browser.
        </h2>
      </div>
    </header>

    <ol class="space-y-16">
      {#each steps as step}
        <li class="grid grid-cols-1 gap-x-12 gap-y-4 lg:grid-cols-12">
          <div class="lg:col-span-3">
            <div class="flex items-baseline gap-4">
              <span
                class="font-[family-name:var(--font-display)] text-[3rem] leading-none text-[color:var(--color-rust)]"
              >
                {step.n}
              </span>
              <span class="label-caps">{step.meta}</span>
            </div>
          </div>
          <div class="lg:col-span-9">
            <h3
              class="font-[family-name:var(--font-display)] text-[1.625rem] leading-[1.15] italic text-[color:var(--color-ink)] sm:text-[1.875rem]"
            >
              {step.title}
            </h3>
            <p
              class="mt-4 max-w-3xl text-[1.0625rem] leading-[1.7] text-[color:var(--color-ink-soft)]"
            >
              {step.body}
            </p>
          </div>
        </li>
      {/each}
    </ol>

    <div class="mt-20 flex items-center justify-center">
      <CtaButton size="lg" label="im Browser starten" />
    </div>
  </div>
</section>
