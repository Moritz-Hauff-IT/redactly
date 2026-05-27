<script lang="ts">
  import '../app.css';
  import NavBar from '$lib/components/NavBar.svelte';
  import Footer from '$lib/components/Footer.svelte';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="flex min-h-screen flex-col bg-white">
  <NavBar />
  <main class="flex-1">
    {@render children()}
  </main>
  <Footer />
</div>
