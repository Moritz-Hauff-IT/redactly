<script lang="ts">
  import { page } from '$app/state';
  // mdsvex compiles .svx to Svelte components, but svelte-check can't see them as
  // typed modules. The ambient declaration in app.d.ts covers package-style
  // wildcard imports but not relative ones, so silence the type-checker here.
  // @ts-expect-error mdsvex module
  import De from './de.svx';
  // @ts-expect-error mdsvex module
  import En from './en.svx';
</script>

{#if page.params.lang === 'en'}
  <En />
{:else}
  <De />
{/if}
