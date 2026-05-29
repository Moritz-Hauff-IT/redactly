<script lang="ts">
  import '../../app.css';
  import NavBar from '$lib/components/NavBar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { page } from '$app/state';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  // Mirror the URL-derived locale onto <html lang> for a11y + browser hints.
  // The translation helpers read page.params.lang directly, so no extra
  // state needs to be wired up here.
  $effect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = page.params.lang === 'en' ? 'en' : 'de';
    }
  });
</script>

<div class="flex min-h-screen flex-col bg-white">
  <NavBar />
  <main class="flex-1">
    {@render children()}
  </main>
  <Footer />
</div>
