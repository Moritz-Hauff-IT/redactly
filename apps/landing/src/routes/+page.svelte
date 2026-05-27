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

<!-- Privacy promise section -->
<section class="bg-slate-900 py-20 text-white">
  <div class="mx-auto max-w-4xl px-4 text-center sm:px-6">
    <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">Deine Daten gehören dir.</h2>
    <p class="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
      de-pii wurde gebaut mit einer einzigen Prämisse: <strong class="text-white"
        >kein Nutzerinhalt verlässt deinen Browser</strong
      >. Keine Server-Logs, keine Analyse, kein Tracking. Nur dein Browser, deine Daten.
    </p>

    <div class="mt-10 grid gap-4 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-700 bg-slate-800 p-5">
        <div class="mb-3 text-2xl">🔒</div>
        <h3 class="font-semibold text-slate-100">Kein Server-Processing</h3>
        <p class="mt-1 text-sm text-slate-400">
          Erkennung und Masking laufen ausschließlich im Browser-Prozess.
        </p>
      </div>
      <div class="rounded-xl border border-slate-700 bg-slate-800 p-5">
        <div class="mb-3 text-2xl">📊</div>
        <h3 class="font-semibold text-slate-100">Kein Tracking</h3>
        <p class="mt-1 text-sm text-slate-400">
          Keine Analytics, keine Cookies, kein Fingerprinting. Nichts.
        </p>
      </div>
      <div class="rounded-xl border border-slate-700 bg-slate-800 p-5">
        <div class="mb-3 text-2xl">👁️</div>
        <h3 class="font-semibold text-slate-100">Prüfbarer Code</h3>
        <p class="mt-1 text-sm text-slate-400">
          Open Source auf GitHub — Versprechen brauchen keine Vertrauen, wenn der Code prüfbar ist.
        </p>
      </div>
    </div>

    <div class="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <CtaButton size="lg" label="Jetzt ausprobieren →" />
      <a
        href="/privacy"
        class="text-sm font-medium text-slate-300 hover:text-white underline underline-offset-2"
      >
        Privacy-Versprechen lesen →
      </a>
    </div>
  </div>
</section>
