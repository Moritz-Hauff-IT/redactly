<script lang="ts">
  import SeoHead from '$lib/components/SeoHead.svelte';
  import { loc, currentLocale, localizedHref } from '$lib/i18n/locale.svelte.js';

  interface BL {
    de: string;
    en: string;
  }
  interface Post {
    slug: string;
    title: BL;
    date: string;
    description: BL;
    author: string;
  }

  // Sorted newest-first; new posts go at the top of this list.
  const posts: Post[] = [
    {
      slug: '2026-05-privacy-engineering',
      title: {
        de: 'Privacy-Engineering im LLM-Zeitalter',
        en: 'Privacy engineering in the LLM era',
      },
      date: '2026-05-29',
      description: {
        de: 'Cloud-LLMs haben die Angriffsfläche für Datenleckagen neu definiert. Ein Blick darauf, was sich konkret geändert hat — und welche Engineering-Prinzipien jetzt zählen.',
        en: 'Cloud LLMs redefined the surface for data leaks. What changed in practice — and the engineering principles that matter now.',
      },
      author: 'Moritz Hauff',
    },
    {
      slug: '2026-05-pii-vs-secrets',
      title: {
        de: 'PII vs. Secrets: zwei Probleme, eine Maskierung',
        en: 'PII vs. secrets: two problems, one masking flow',
      },
      date: '2026-05-29',
      description: {
        de: 'Personenbezogene Daten und Secrets sehen oberflächlich ähnlich aus, brauchen aber unterschiedliche Erkennungsstrategien. Eine technische Tour durch beides.',
        en: 'Personal data and secrets look similar at a glance but need very different detection strategies. A technical tour through both.',
      },
      author: 'Moritz Hauff',
    },
    {
      slug: '2026-05-dsgvo-llm',
      title: {
        de: 'DSGVO und LLMs: Art. 6, 9 und 32 in der Praxis',
        en: 'GDPR and LLMs: Arts. 6, 9, and 32 in practice',
      },
      date: '2026-05-29',
      description: {
        de: 'Wenn Mitarbeiter:innen personenbezogene Daten in Cloud-LLMs eingeben, ist das eine Auftragsverarbeitung — oder Schlimmeres. Eine praktische Einordnung der DSGVO-Pflichten.',
        en: "When employees paste personal data into cloud LLMs, that's a processor relationship — or worse. A practical walk-through of the GDPR obligations.",
      },
      author: 'Moritz Hauff',
    },
    {
      slug: '2026-05-launch',
      title: { de: 'Warum wir Redactly bauen', en: "Why we're building Redactly" },
      date: '2026-05-27',
      description: {
        de: 'Der Ausgangspunkt: Warum PII-Masking vor dem LLM sinnvoller ist als danach — und warum Browser-native der richtige Ansatz ist.',
        en: 'The starting point: why PII masking before the LLM beats masking after — and why browser-native is the right approach.',
      },
      author: 'Moritz Hauff',
    },
  ];

  function formatDate(iso: string): string {
    const lang = currentLocale();
    return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  const seo = $derived(
    loc({
      de: {
        title: 'Blog',
        desc: 'Der Redactly-Blog: Hintergrundinfos, Release Notes und Gedanken zu Privacy-First LLM-Nutzung.',
      },
      en: {
        title: 'Blog',
        desc: 'The Redactly blog: background, release notes, and thinking on privacy-first LLM usage.',
      },
    })
  );

  const heading = $derived(loc({ de: 'Blog', en: 'Blog' }));
  const subheading = $derived(
    loc({
      de: 'Hintergründe, Releases und Gedanken zu Privacy-First LLM-Nutzung.',
      en: 'Background, releases, and thinking on privacy-first LLM usage.',
    })
  );
  const readMore = $derived(loc({ de: 'Weiterlesen →', en: 'Read more →' }));
</script>

<SeoHead title={seo.title} description={seo.desc} path="/blog" />

<div class="bg-white py-16 sm:py-20">
  <div class="mx-auto max-w-3xl px-4 sm:px-6">
    <div class="mb-12">
      <h1 class="text-4xl font-extrabold tracking-tight text-slate-900">{heading}</h1>
      <p class="mt-4 text-xl text-slate-600">{subheading}</p>
    </div>

    <div class="space-y-6">
      {#each posts as post}
        <a
          href={localizedHref(`/blog/posts/${post.slug}`)}
          class="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-teal-300 hover:shadow-md"
        >
          <div class="mb-2 flex items-center gap-3 text-sm text-slate-500">
            <time datetime={post.date}>{formatDate(post.date)}</time>
            <span>&middot;</span>
            <span>{post.author}</span>
          </div>
          <h2 class="mb-2 text-xl font-bold text-slate-900 group-hover:text-teal-700">
            {loc(post.title)}
          </h2>
          <p class="text-slate-600">{loc(post.description)}</p>
          <span
            class="mt-4 inline-block text-sm font-medium text-teal-600 group-hover:text-teal-700"
          >
            {readMore}
          </span>
        </a>
      {/each}
    </div>
  </div>
</div>
