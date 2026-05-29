import type { RequestHandler } from './$types';

const SITE = 'https://redactly.dev';
const LOCALES = ['', '/en'] as const; // '' = German default, '/en' = English

// Unprefixed routes. Each emits one entry per locale, with full xhtml:link
// hreflang annotations for the search-engine multi-language signal.
const ROUTES: Array<{ path: string; priority: string; changefreq: string; lastmod?: string }> = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/features', priority: '0.9', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.9', changefreq: 'monthly' },
  { path: '/faq', priority: '0.8', changefreq: 'monthly' },
  { path: '/docs', priority: '0.7', changefreq: 'monthly' },
  { path: '/docs/getting-started', priority: '0.7', changefreq: 'monthly' },
  { path: '/docs/self-hosting', priority: '0.6', changefreq: 'monthly' },
  { path: '/docs/api', priority: '0.6', changefreq: 'monthly' },
  { path: '/blog', priority: '0.7', changefreq: 'weekly' },
  {
    path: '/blog/posts/2026-05-privacy-engineering',
    priority: '0.7',
    changefreq: 'yearly',
    lastmod: '2026-05-29',
  },
  {
    path: '/blog/posts/2026-05-pii-vs-secrets',
    priority: '0.7',
    changefreq: 'yearly',
    lastmod: '2026-05-29',
  },
  {
    path: '/blog/posts/2026-05-dsgvo-llm',
    priority: '0.7',
    changefreq: 'yearly',
    lastmod: '2026-05-29',
  },
  {
    path: '/blog/posts/2026-05-launch',
    priority: '0.6',
    changefreq: 'yearly',
    lastmod: '2026-05-27',
  },
];

function localeUrl(prefix: string, path: string): string {
  const tail = path === '/' ? '' : path;
  return `${SITE}${prefix}${tail}`;
}

export const prerender = true;

export const GET: RequestHandler = async () => {
  const urls = ROUTES.flatMap(({ path, priority, changefreq, lastmod }) => {
    const deUrl = localeUrl('', path);
    const enUrl = localeUrl('/en', path);
    return LOCALES.map((prefix) => {
      const selfUrl = localeUrl(prefix, path);
      const lastmodTag = lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '';
      return `  <url>
    <loc>${selfUrl}</loc>
${lastmodTag}    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="de" href="${deUrl}" />
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${deUrl}" />
  </url>`;
    });
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
