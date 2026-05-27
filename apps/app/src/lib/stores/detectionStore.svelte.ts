import type { Entity, EntityCategory } from '@de-pii/core';

export interface EntityWithId extends Entity {
  id: string;
}

function entityId(entity: Entity): string {
  return `${entity.start}-${entity.end}-${entity.type}`;
}

function createDetectionStore() {
  let entities = $state<EntityWithId[]>([]);
  let enabledIds = $state<Set<string>>(new Set());

  const activeEntities = $derived(entities.filter((e) => enabledIds.has(e.id)));

  return {
    get entities() {
      return entities;
    },
    get enabledIds() {
      return enabledIds;
    },
    get activeEntities() {
      return activeEntities;
    },

    setEntities(newEntities: Entity[]) {
      const withIds: EntityWithId[] = newEntities.map((e) => ({
        ...e,
        id: entityId(e),
      }));
      entities = withIds;
      enabledIds = new Set(withIds.map((e) => e.id));
    },

    toggleEntity(id: string) {
      const next = new Set(enabledIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      enabledIds = next;
    },

    enableAllCategory(cat: EntityCategory) {
      const next = new Set(enabledIds);
      for (const e of entities) {
        if (e.category === cat) next.add(e.id);
      }
      enabledIds = next;
    },

    disableAllCategory(cat: EntityCategory) {
      const next = new Set(enabledIds);
      for (const e of entities) {
        if (e.category === cat) next.delete(e.id);
      }
      enabledIds = next;
    },

    clear() {
      entities = [];
      enabledIds = new Set();
    },
  };
}

export const detectionStore = createDetectionStore();
