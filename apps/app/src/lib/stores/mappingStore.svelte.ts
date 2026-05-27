import type { Mapping } from '@de-pii/core/masker';

function createMappingStore() {
  let mapping = $state<Mapping | null>(null);

  return {
    get current() {
      return mapping;
    },
    set(m: Mapping) {
      mapping = m;
    },
    clear() {
      mapping = null;
    },
    get(): Mapping | null {
      return mapping;
    },
  };
}

export const mappingStore = createMappingStore();
