// Ambient type declarations for the landing app.

// See https://svelte.dev/docs/kit/types#app
// for information about these interfaces.
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

// Make `.svx` (mdsvex) files importable as Svelte components for the
// type-checker. mdsvex compiles them to Svelte components at build time,
// but svelte-check needs this hint to resolve them in TypeScript code.
// Both forms — bare specifier and relative — are needed because TS resolves
// relative imports differently from package-style wildcards.
declare module '*.svx' {
  import type { Component } from 'svelte';
  const component: Component;
  export default component;
}
declare module './*.svx' {
  import type { Component } from 'svelte';
  const component: Component;
  export default component;
}

export {};
