<script lang="ts">
  import SeoHead from '$lib/components/SeoHead.svelte';

  interface Post {
    slug: string;
    title: string;
    date: string;
    description: string;
    author: string;
  }

  const posts: Post[] = [
    {
      slug: '2026-05-launch',
      title: 'Warum wir Redactly bauen',
      date: '2026-05-27',
      description:
        'Der Ausgangspunkt: Warum PII-Masking vor dem LLM sinnvoller ist als danach — und warum Browser-native der richtige Ansatz ist.',
      author: 'Moritz Hauff',
    },
  ];

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
</script>

<SeoHead
  title="Blog"
  description="Der Redactly Blog: Hintergrundinfos, Release Notes und Gedanken zu Privacy-First LLM-Nutzung."
  path="/blog"
/>

<div class="bg-white py-16 sm:py-20">
  <div class="mx-auto max-w-3xl px-4 sm:px-6">
    <div class="mb-12">
      <h1 class="text-4xl font-extrabold tracking-tight text-slate-900">Blog</h1>
      <p class="mt-4 text-xl text-slate-600">
        Hintergründe, Releases und Gedanken zu Privacy-First LLM-Nutzung.
      </p>
    </div>

    <div class="space-y-6">
      {#each posts as post}
        <a
          href="/blog/posts/{post.slug}"
          class="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-teal-300 hover:shadow-md"
        >
          <div class="mb-2 flex items-center gap-3 text-sm text-slate-500">
            <time datetime={post.date}>{formatDate(post.date)}</time>
            <span>&middot;</span>
            <span>{post.author}</span>
          </div>
          <h2 class="mb-2 text-xl font-bold text-slate-900 group-hover:text-teal-700">
            {post.title}
          </h2>
          <p class="text-slate-600">{post.description}</p>
          <span
            class="mt-4 inline-block text-sm font-medium text-teal-600 group-hover:text-teal-700"
          >
            Weiterlesen →
          </span>
        </a>
      {/each}
    </div>
  </div>
</div>
