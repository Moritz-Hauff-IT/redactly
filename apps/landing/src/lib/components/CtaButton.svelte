<script lang="ts">
  import { APP_URL } from '$lib/env';

  interface Props {
    href?: string;
    size?: 'sm' | 'md' | 'lg';
    label?: string;
  }

  let { href = APP_URL, size = 'md', label = 'Zur App →' }: Props = $props();

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };
</script>

<a
  {href}
  class="inline-flex items-center gap-2 rounded-xl bg-teal-600 font-semibold text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow-md {sizeClasses[
    size
  ]}"
>
  {label}
</a>
