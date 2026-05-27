import type { RequestHandler } from './$types';

const SITE = 'https://redactly.dev';

// Static routes with their priority + change frequency.
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
    path: '/blog/posts/2026-05-launch',
    priority: '0.6',
    changefreq: 'yearly',
    lastmod: '2026-05-27',
  },
];

export const prerender = true;

export const GET: RequestHandler = async () => {
  const urls = ROUTES.map(({ path, priority, changefreq, lastmod }) => {
    const loc = `${SITE}${path === '/' ? '' : path}`;
    const lastmodTag = lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '';
    return `  <url>
    <loc>${loc}</loc>
${lastmodTag}    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
