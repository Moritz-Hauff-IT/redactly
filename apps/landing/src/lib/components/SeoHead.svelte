<script lang="ts">
  interface Props {
    /** Page title; will be suffixed with " | Redactly" unless `bare` is true. */
    title: string;
    /** Meta description (≤ 160 chars recommended). */
    description: string;
    /** Path of the current page, e.g. "/", "/privacy", "/blog/posts/launch". */
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
  const canonical = $derived(`${SITE_URL}${path === '/' ? '' : path}`);
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
  <meta property="og:locale" content="de_DE" />
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

  <!-- hreflang (DE only for now) -->
  <link rel="alternate" hreflang="de" href={canonical} />
  <link rel="alternate" hreflang="x-default" href={canonical} />
</svelte:head>
