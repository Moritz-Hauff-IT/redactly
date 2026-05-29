<script lang="ts">
  import { localizedHref } from '$lib/i18n/locale.svelte.js';

  interface Props {
    title: string;
    backHref: string;
    backLabel?: string;
    children: import('svelte').Snippet;
  }

  let { title, backHref, backLabel = 'Dokumentation', children }: Props = $props();
</script>

<div class="bg-white py-16">
  <div class="mx-auto max-w-3xl px-4 sm:px-6">
    <nav class="mb-8 text-sm text-slate-500">
      <a href={localizedHref(backHref)} class="hover:text-teal-600">{backLabel}</a>
      <span class="mx-2">/</span>
      <span class="text-slate-900">{title}</span>
    </nav>
    <div
      class="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-teal-600 prose-code:text-slate-800 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm"
    >
      {@render children()}
    </div>
  </div>
</div>
