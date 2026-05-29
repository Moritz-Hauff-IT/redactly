<script lang="ts">
  import CtaButton from './CtaButton.svelte';
  import { loc } from '$lib/i18n/locale.svelte.js';

  interface BL {
    de: string;
    en: string;
  }

  const steps: { n: string; cmd: string; title: BL; body: BL; stat: BL }[] = [
    {
      n: '01',
      cmd: 'paste.input',
      title: {
        de: 'Du fügst ein, was sensibel ist.',
        en: 'You paste what is sensitive.',
      },
      body: {
        de: 'Email-Entwurf, Code-Snippet, Log-Dump, eine PDF mit Vertragstext. Redactly liest mit — aber nur in deinem Browser-Tab. Erkennt automatisch, was nach einer Person, Email, IBAN, einem Token oder Secret aussieht.',
        en: 'Email draft, code snippet, log dump, a PDF with contract text. Redactly reads along — but only in your browser tab. Auto-detects what looks like a person, email, IBAN, token, or secret.',
      },
      stat: { de: 'execute: local', en: 'execute: local' },
    },
    {
      n: '02',
      cmd: 'mask.send',
      title: {
        de: 'Du gibst die redigierte Kopie ans LLM.',
        en: 'You take the redacted copy to the LLM.',
      },
      body: {
        de: '„Martin Müller" wird zu [PERSON_1]. Dein AWS-Key wird zu [SECRET_3]. Du fügst den maskierten Text in ChatGPT oder Claude ein. Das Modell sieht Platzhalter — und nur Platzhalter.',
        en: '"Martin Müller" becomes [PERSON_1]. Your AWS key becomes [SECRET_3]. You paste the masked text into ChatGPT or Claude. The model sees placeholders — and only placeholders.',
      },
      stat: { de: 'llm sieht: tokens only', en: 'llm sees: tokens only' },
    },
    {
      n: '03',
      cmd: 'restore.local',
      title: {
        de: 'Die Antwort kommt zurück — und wird wieder lesbar.',
        en: 'The response comes back — and gets readable again.',
      },
      body: {
        de: 'Du fügst die LLM-Antwort in Redactly ein. Platzhalter werden gegen deine echten Werte ersetzt, weil das Mapping lokal beim Maskieren entstanden ist und diesen Tab nie verlassen hat.',
        en: "You paste the LLM's reply into Redactly. Placeholders are swapped for your real values, because the mapping was created locally during masking and has never left this tab.",
      },
      stat: { de: 'restore: clientside', en: 'restore: clientside' },
    },
  ];

  const sectionEyebrow = loc({ de: '03 / pipeline', en: '03 / pipeline' });
  const sectionTitleA = $derived(loc({ de: 'Drei Operationen.', en: 'Three operations.' }));
  const sectionTitleB = $derived(loc({ de: 'Alle client-resident.', en: 'All client-resident.' }));
  const flowLabel = $derived(
    loc({ de: 'flow: input → mask → restore', en: 'flow: input → mask → restore' })
  );
  const ctaPrompt = $derived(loc({ de: 'bereit zum Testen?', en: 'ready to test?' }));
</script>

<section
  class="border-b border-[color:var(--color-line)] bg-[color:var(--color-shell-sunken)] py-24 sm:py-32"
>
  <div class="mx-auto max-w-7xl px-5 sm:px-8">
    <!-- Section header -->
    <header
      class="mb-16 flex flex-wrap items-end justify-between gap-6 border-b border-[color:var(--color-line-strong)] pb-4"
    >
      <div>
        <span class="label label-signal">{sectionEyebrow}</span>
        <h2 class="display mt-3 text-[2.5rem] text-[color:var(--color-text)] sm:text-[3.5rem]">
          {sectionTitleA}<br />
          <span class="text-[color:var(--color-text-dim)]">{sectionTitleB}</span>
        </h2>
      </div>
      <div
        class="font-[family-name:var(--font-mono)] text-[0.75rem] text-[color:var(--color-text-mute)]"
      >
        {flowLabel}
      </div>
    </header>

    <!-- Steps as terminal-style cards -->
    <ol class="space-y-px bg-[color:var(--color-line)]">
      {#each steps as step}
        <li
          class="group bg-[color:var(--color-shell)] transition-colors hover:bg-[color:var(--color-shell-raised)]"
        >
          <div class="grid grid-cols-1 gap-x-8 gap-y-4 px-6 py-8 sm:px-10 sm:py-10 lg:grid-cols-12">
            <!-- Number + command -->
            <div class="lg:col-span-3">
              <div
                class="display text-[3.5rem] leading-none text-[color:var(--color-signal)] sm:text-[5rem]"
              >
                {step.n}
              </div>
              <div
                class="mt-3 font-[family-name:var(--font-mono)] text-[0.75rem] tracking-[0.08em] text-[color:var(--color-text-mute)]"
              >
                <span class="text-[color:var(--color-signal)]">$</span>
                {step.cmd}
              </div>
            </div>

            <!-- Body -->
            <div class="lg:col-span-7">
              <h3
                class="display text-[1.625rem] leading-tight text-[color:var(--color-text)] sm:text-[1.875rem]"
              >
                {loc(step.title)}
              </h3>
              <p
                class="mt-4 max-w-3xl font-[family-name:var(--font-mono)] text-[0.9rem] leading-[1.7] text-[color:var(--color-text-dim)]"
              >
                {loc(step.body)}
              </p>
            </div>

            <!-- Stat badge -->
            <div class="flex items-start lg:col-span-2 lg:justify-end">
              <span
                class="inline-flex items-center gap-2 border border-[color:var(--color-line-strong)] bg-[color:var(--color-shell-sunken)] px-3 py-1.5 font-[family-name:var(--font-mono)] text-[0.65rem] tracking-[0.08em] uppercase text-[color:var(--color-ok)]"
              >
                <span class="h-1.5 w-1.5 bg-[color:var(--color-ok)]"></span>
                {loc(step.stat)}
              </span>
            </div>
          </div>
        </li>
      {/each}
    </ol>

    <div class="mt-20 flex flex-col items-center gap-4 text-center">
      <span class="label">{ctaPrompt}</span>
      <CtaButton size="lg" />
    </div>
  </div>
</section>
