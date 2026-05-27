<script lang="ts">
  import Hero from '$lib/components/Hero.svelte';
  import FeatureGrid from '$lib/components/FeatureGrid.svelte';
  import HowItWorks from '$lib/components/HowItWorks.svelte';
  import CtaButton from '$lib/components/CtaButton.svelte';
  import SeoHead from '$lib/components/SeoHead.svelte';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://redactly.dev/#website',
        url: 'https://redactly.dev',
        name: 'Redactly',
        description: 'Browser-only PII und Secret Masking für sichere LLM-Eingaben',
        inLanguage: 'de',
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Redactly',
        applicationCategory: 'SecurityApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        url: 'https://app.redactly.dev',
        downloadUrl: 'https://github.com/moritz-hauff-it/redactly',
        license: 'https://opensource.org/licenses/MIT',
        description:
          'Reversibles Maskieren von PII und Secrets vor dem Versand an ChatGPT, Claude und andere LLMs. 100 % lokal im Browser.',
      },
      {
        '@type': 'Organization',
        '@id': 'https://redactly.dev/#org',
        name: 'Redactly',
        url: 'https://redactly.dev',
        sameAs: ['https://github.com/moritz-hauff-it/redactly'],
      },
    ],
  };
</script>

<SeoHead
  title="Sichere LLM-Eingaben ohne Datenweitergabe"
  description="Maskiere PII und Secrets, bevor sie deinen Browser verlassen. 100 % lokal. Open Source. Reversibel."
  path="/"
/>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</` + `script>`}
</svelte:head>

<Hero />
<FeatureGrid />
<HowItWorks />

<!-- Closing manifesto — inverse panel, dark ink on bright rust, with editorial typesetting -->
<section
  class="relative border-t border-[color:var(--color-rule)] bg-[color:var(--color-ink)] py-24 text-[color:var(--color-paper)] sm:py-32"
>
  <div class="mx-auto max-w-6xl px-5 sm:px-8">
    <div class="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <div class="lg:col-span-3">
        <span class="label-caps text-[color:var(--color-rust)]">§ 4 — Schlusswort</span>
      </div>
      <div class="lg:col-span-9">
        <blockquote
          class="font-[family-name:var(--font-display)] text-[2rem] leading-[1.15] italic tracking-tight sm:text-[2.75rem]"
        >
          „Deine Daten gehören dir.<br />
          Dieses Werkzeug ist die <span class="text-[color:var(--color-rust)]">Architektur</span>,
          die das wahr macht."
        </blockquote>

        <div class="mt-12 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-3">
          <div>
            <span class="label-caps text-[color:var(--color-paper)]/60">Versprechen</span>
            <p class="mt-2 text-sm leading-relaxed text-[color:var(--color-paper)]/85">
              Kein Server berührt deine Eingabe. Erkennung und Maskierung laufen im selben Prozess
              wie dein Browser-Tab.
            </p>
          </div>
          <div>
            <span class="label-caps text-[color:var(--color-paper)]/60">Beweis</span>
            <p class="mt-2 text-sm leading-relaxed text-[color:var(--color-paper)]/85">
              Öffne die DevTools. Schau in den Netzwerk-Tab. Tippe, was du willst. Es geht keine
              POST-Anfrage raus, die deinen Text enthält.
            </p>
          </div>
          <div>
            <span class="label-caps text-[color:var(--color-paper)]/60">Lizenz</span>
            <p class="mt-2 text-sm leading-relaxed text-[color:var(--color-paper)]/85">
              MIT. Forke es, hoste es selbst, lies den Code. Vertrauen ist keine Antwort. Lesen
              schon.
            </p>
          </div>
        </div>

        <div class="mt-12 flex flex-col gap-5 sm:flex-row sm:items-center">
          <CtaButton size="lg" label="App jetzt starten" />
          <a
            href="/privacy"
            class="group inline-flex items-baseline gap-2 font-[family-name:var(--font-display)] text-lg italic text-[color:var(--color-paper)]/80 underline decoration-[color:var(--color-paper)]/30 decoration-1 underline-offset-[6px] transition-all hover:text-[color:var(--color-paper)] hover:decoration-[color:var(--color-rust)]"
          >
            das ganze Privacy-Manifest
            <span class="not-italic font-[family-name:var(--font-mono)] text-sm">↗</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>
