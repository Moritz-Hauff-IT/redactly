<script lang="ts">
  import { APP_URL } from '$lib/env';

  interface Props {
    href?: string;
    size?: 'sm' | 'md' | 'lg';
    label?: string;
  }

  let { href = APP_URL, size = 'md', label = 'run.app' }: Props = $props();

  const sizeClasses = {
    sm: 'px-4 py-2 text-[0.7rem]',
    md: 'px-6 py-3 text-[0.8rem]',
    lg: 'px-8 py-4 text-[0.875rem]',
  };
</script>

<a
  {href}
  class="group relative inline-flex items-center gap-3 border-2 border-[color:var(--color-signal)] bg-[color:var(--color-signal)] font-[family-name:var(--font-mono)] font-bold tracking-[0.1em] text-[color:var(--color-shell)] uppercase transition-all hover:bg-transparent hover:text-[color:var(--color-signal)] {sizeClasses[
    size
  ]}"
>
  <span
    aria-hidden="true"
    class="text-[color:var(--color-shell)] group-hover:text-[color:var(--color-signal)]">$</span
  >
  {label}
  <span aria-hidden="true" class="transition-transform group-hover:translate-x-0.5">→</span>
</a>
