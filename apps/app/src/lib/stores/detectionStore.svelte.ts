import type { Entity, EntityCategory } from '@redactly/core/types';

export interface EntityWithId extends Entity {
  id: string;
}

function entityId(entity: Entity): string {
  return `${entity.start}-${entity.end}-${entity.type}-${entity.source}`;
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
      // Preserve manual entities
      const manualEntities = entities.filter((e) => e.source === 'manual');
      const withIds: EntityWithId[] = newEntities.map((e) => ({
        ...e,
        id: entityId(e),
      }));
      // Merge: new entities take precedence, keep manuals that don't overlap
      const merged = [
        ...withIds,
        ...manualEntities.filter((m) => !withIds.some((w) => w.start < m.end && m.start < w.end)),
      ];
      merged.sort((a, b) => a.start - b.start);
      entities = merged;
      const existingEnabled = new Set(enabledIds);
      const newEnabled = new Set<string>();
      for (const e of merged) {
        // Enable new non-manual entities; preserve manual entity enabled state
        if (e.source === 'manual') {
          if (existingEnabled.has(e.id)) newEnabled.add(e.id);
          else newEnabled.add(e.id); // enable new manual by default
        } else {
          newEnabled.add(e.id);
        }
      }
      enabledIds = newEnabled;
    },

    addEntity(entity: Entity) {
      const withId: EntityWithId = { ...entity, id: entityId(entity) };
      const next = [...entities, withId].sort((a, b) => a.start - b.start);
      entities = next;
      const nextEnabled = new Set(enabledIds);
      nextEnabled.add(withId.id);
      enabledIds = nextEnabled;
    },

    removeEntity(id: string) {
      entities = entities.filter((e) => e.id !== id);
      const next = new Set(enabledIds);
      next.delete(id);
      enabledIds = next;
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
