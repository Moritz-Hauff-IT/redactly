<script lang="ts">
  import SeoHead from '$lib/components/SeoHead.svelte';

  const docLinks = [
    {
      href: '/docs/getting-started',
      icon: '🚀',
      title: 'Getting Started',
      description:
        'Schritt-für-Schritt-Anleitung: App öffnen, Text maskieren, Antwort restaurieren.',
    },
    {
      href: '/docs/self-hosting',
      icon: '🏠',
      title: 'Self-Hosting',
      description:
        'de-pii auf deiner eigenen Infrastruktur betreiben — Docker, Kubernetes, Static Host.',
    },
    {
      href: '/docs/api',
      icon: '📦',
      title: '@de-pii/core API',
      description: 'Das headless Core-Paket für programmatische Nutzung in eigenen Applikationen.',
    },
  ];
</script>

<SeoHead
  title="Dokumentation"
  description="Redactly Dokumentation: Getting Started, Self-Hosting, API-Referenz."
  path="/docs"
/>

<div class="bg-white py-16 sm:py-20">
  <div class="mx-auto max-w-4xl px-4 sm:px-6">
    <div class="mb-12">
      <h1 class="text-4xl font-extrabold tracking-tight text-slate-900">Dokumentation</h1>
      <p class="mt-4 text-xl text-slate-600">
        Alles, was du brauchst, um de-pii zu nutzen, selbst zu hosten oder programmatisch
        einzusetzen.
      </p>
    </div>

    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each docLinks as doc}
        <a
          href={doc.href}
          class="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-teal-300 hover:shadow-md"
        >
          <div class="mb-3 text-3xl">{doc.icon}</div>
          <h2 class="mb-2 text-lg font-semibold text-slate-900 group-hover:text-teal-700">
            {doc.title}
          </h2>
          <p class="text-sm text-slate-600">{doc.description}</p>
          <span class="mt-4 text-sm font-medium text-teal-600 group-hover:text-teal-700">
            Lesen →
          </span>
        </a>
      {/each}
    </div>
  </div>
</div>
