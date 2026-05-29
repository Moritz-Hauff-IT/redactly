<script lang="ts">
  import { currentLocale } from '$lib/i18n/locale.svelte.js';

  interface Props {
    /** Page title; will be suffixed with " | Redactly" unless `bare` is true. */
    title: string;
    /** Meta description (≤ 160 chars recommended). */
    description: string;
    /** UNPREFIXED path of the current page (e.g. "/", "/privacy",
     * "/blog/posts/launch"). The component automatically generates the
     * `/` and `/en/` URL variants for canonical + hreflang tags. */
    path: string;
    /** OG type. Default "website". Use "article" for blog posts. */
    ogType?: 'website' | 'article';
    /** Optional published date (ISO) for article OG type. */
    publishedTime?: string;
    /** If true, use `title` verbatim with no " | Redactly" suffix. */
    bare?: boolean;
    /** Optional absolute OG image URL. */
    ogImage?: string;
  }

  let {
    title,
    description,
    path,
    ogType = 'website',
    publishedTime,
    bare = false,
    ogImage = 'https://redactly.dev/og-image.png',
  }: Props = $props();

  const SITE_URL = 'https://redactly.dev';
  const fullTitle = $derived(bare ? title : `${title} | Redactly`);

  // Build absolute URLs for both locales. `path` is the unprefixed canonical
  // path (e.g. "/blog"); the German URL stays bare, the English URL gets
  // the `/en` prefix prepended.
  const lang = $derived(currentLocale());
  const dePath = $derived(path === '/' ? '' : path);
  const enPath = $derived(path === '/' ? '/en' : `/en${path}`);
  const deUrl = $derived(`${SITE_URL}${dePath}`);
  const enUrl = $derived(`${SITE_URL}${enPath}`);
  // The canonical of the page YOU'RE ON
  const canonical = $derived(lang === 'en' ? enUrl : deUrl);
  const ogLocale = $derived(lang === 'en' ? 'en_US' : 'de_DE');
</script>

<svelte:head>
  <title>{fullTitle}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />

  <!-- Open Graph -->
  <meta property="og:title" content={fullTitle} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonical} />
  <meta property="og:type" content={ogType} />
  <meta property="og:site_name" content="Redactly" />
  <meta property="og:locale" content={ogLocale} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:image:alt" content="Redactly – Browser-only PII masking" />
  {#if publishedTime}
    <meta property="article:published_time" content={publishedTime} />
  {/if}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={fullTitle} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImage} />

  <!-- hreflang: declare both locale URLs + x-default → DE -->
  <link rel="alternate" hreflang="de" href={deUrl} />
  <link rel="alternate" hreflang="en" href={enUrl} />
  <link rel="alternate" hreflang="x-default" href={deUrl} />
</svelte:head>
