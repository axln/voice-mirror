<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';
  import { clsx } from 'clsx';

  var {
    children,
    class: className = '',
    element = $bindable(),
    ...rest
  }: {
    children: Snippet;
    class?: ClassValue;
    element?: HTMLButtonElement;
    [key: string]: any;
  } = $props();
</script>

<button
  bind:this={element}
  class={twMerge(
    'inline-flex cursor-pointer items-center justify-center rounded-full transition-all duration-150 ease-out',
    'active:scale-95',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
    clsx(className)
  )}
  {...rest}
>
  {@render children()}
</button>
