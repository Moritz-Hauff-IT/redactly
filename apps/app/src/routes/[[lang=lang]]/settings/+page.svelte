<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  // Settings are now a drawer overlaid on the workspace, not a separate route.
  // Redirect any deep links to / and let the layout's settings button open the drawer.
  onMount(() => {
    goto('/', { replaceState: true });
  });
</script>

<p class="text-[color:var(--color-ink-mute)]">Weiterleitung …</p>
