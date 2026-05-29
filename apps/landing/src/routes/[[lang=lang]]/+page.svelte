<script lang="ts">
  import Hero from '$lib/components/Hero.svelte';
  import FeatureGrid from '$lib/components/FeatureGrid.svelte';
  import HowItWorks from '$lib/components/HowItWorks.svelte';
  import CtaButton from '$lib/components/CtaButton.svelte';
  import SeoHead from '$lib/components/SeoHead.svelte';
  import { loc, localizedHref, currentLocale } from '$lib/i18n/locale.svelte.js';

  const lang = $derived(currentLocale());
  const jsonLd = $derived({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://redactly.dev/#website',
        url: 'https://redactly.dev',
        name: 'Redactly',
        description:
          lang === 'en'
            ? 'Browser-only PII and secret masking for safe LLM input'
            : 'Browser-only PII und Secret Masking für sichere LLM-Eingaben',
        inLanguage: lang,
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
          lang === 'en'
            ? 'Reversibly mask PII and secrets before sending to ChatGPT, Claude and other LLMs. 100% local in your browser.'
            : 'Reversibles Maskieren von PII und Secrets vor dem Versand an ChatGPT, Claude und andere LLMs. 100 % lokal im Browser.',
      },
      {
        '@type': 'Organization',
        '@id': 'https://redactly.dev/#org',
        name: 'Redactly',
        url: 'https://redactly.dev',
        sameAs: ['https://github.com/moritz-hauff-it/redactly'],
      },
    ],
  });

  const seo = $derived(
    loc({
      de: {
        title: 'Sichere LLM-Eingaben ohne Datenweitergabe',
        desc: 'Maskiere PII und Secrets, bevor sie deinen Browser verlassen. 100 % lokal. Open Source. Reversibel.',
      },
      en: {
        title: 'Safe LLM input without data transfer',
        desc: 'Mask PII and secrets before they leave your browser. 100% local. Open source. Reversible.',
      },
    })
  );

  const manifestoSection = $derived(loc({ de: '§ 4 — Schlusswort', en: '§ 4 — Closing' }));
  const manifestoQuoteA = $derived(
    loc({ de: 'Deine Daten gehören dir.', en: 'Your data is yours.' })
  );
  const manifestoQuoteB = $derived(
    loc({ de: 'Dieses Werkzeug ist die ', en: 'This tool is the ' })
  );
  const manifestoQuoteC = $derived(loc({ de: 'Architektur', en: 'architecture' }));
  const manifestoQuoteD = $derived(
    loc({ de: ', die das wahr macht.', en: ' that makes that true.' })
  );

  const promiseLabel = $derived(loc({ de: 'Versprechen', en: 'Promise' }));
  const promiseBody = $derived(
    loc({
      de: 'Kein Server berührt deine Eingabe. Erkennung und Maskierung laufen im selben Prozess wie dein Browser-Tab.',
      en: 'No server ever touches your input. Detection and masking run in the same process as your browser tab.',
    })
  );
  const proofLabel = $derived(loc({ de: 'Beweis', en: 'Proof' }));
  const proofBody = $derived(
    loc({
      de: 'Öffne die DevTools. Schau in den Netzwerk-Tab. Tippe, was du willst. Es geht keine POST-Anfrage raus, die deinen Text enthält.',
      en: 'Open DevTools. Check the network tab. Type whatever you like. No POST request leaves with your text in it.',
    })
  );
  const licenseLabel = $derived(loc({ de: 'Lizenz', en: 'Licence' }));
  const licenseBody = $derived(
    loc({
      de: 'MIT. Forke es, hoste es selbst, lies den Code. Vertrauen ist keine Antwort. Lesen schon.',
      en: 'MIT. Fork it, self-host it, read the code. Trust is not an answer. Reading is.',
    })
  );

  const ctaLabel = $derived(loc({ de: 'App jetzt starten', en: 'Open the app' }));
  const privacyLink = $derived(
    loc({
      de: 'das ganze Privacy-Manifest',
      en: 'read the full privacy manifesto',
    })
  );
</script>

<SeoHead title={seo.title} description={seo.desc} path="/" />

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
        <span class="label-caps text-[color:var(--color-rust)]">{manifestoSection}</span>
      </div>
      <div class="lg:col-span-9">
        <blockquote
          class="font-[family-name:var(--font-display)] text-[2rem] leading-[1.15] italic tracking-tight sm:text-[2.75rem]"
        >
          „{manifestoQuoteA}<br />
          {manifestoQuoteB}<span class="text-[color:var(--color-rust)]">{manifestoQuoteC}</span
          >{manifestoQuoteD}"
        </blockquote>

        <div class="mt-12 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-3">
          <div>
            <span class="label-caps text-[color:var(--color-paper)]/60">{promiseLabel}</span>
            <p class="mt-2 text-sm leading-relaxed text-[color:var(--color-paper)]/85">
              {promiseBody}
            </p>
          </div>
          <div>
            <span class="label-caps text-[color:var(--color-paper)]/60">{proofLabel}</span>
            <p class="mt-2 text-sm leading-relaxed text-[color:var(--color-paper)]/85">
              {proofBody}
            </p>
          </div>
          <div>
            <span class="label-caps text-[color:var(--color-paper)]/60">{licenseLabel}</span>
            <p class="mt-2 text-sm leading-relaxed text-[color:var(--color-paper)]/85">
              {licenseBody}
            </p>
          </div>
        </div>

        <div class="mt-12 flex flex-col gap-5 sm:flex-row sm:items-center">
          <CtaButton size="lg" label={ctaLabel} />
          <a
            href={localizedHref('/privacy')}
            class="group inline-flex items-baseline gap-2 font-[family-name:var(--font-display)] text-lg italic text-[color:var(--color-paper)]/80 underline decoration-[color:var(--color-paper)]/30 decoration-1 underline-offset-[6px] transition-all hover:text-[color:var(--color-paper)] hover:decoration-[color:var(--color-rust)]"
          >
            {privacyLink}
            <span class="font-[family-name:var(--font-mono)] text-sm not-italic">↗</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>
