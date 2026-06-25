import { classifyRequest } from '@redactly/core/networkClassify';

/**
 * Live, in-tab network self-audit.
 *
 * Wraps `window.fetch` once to record where this tab connects — proof, visible
 * to the user, that Redactly only ever *downloads* models/assets and never
 * uploads their text. Counts are grouped by host; any cross-origin write is
 * tallied separately as a potential data upload (which must stay at zero).
 *
 * Main-thread only: model workers fetch their own weights, but user text is
 * only ever handled on the main thread and is never sent anywhere.
 */

export interface HostStat {
  host: string;
  kind: 'same-origin' | 'model' | 'other';
  count: number;
}

function createNetworkAuditStore() {
  let installed = false;
  let total = $state(0);
  let uploads = $state(0);
  const byHost = $state(new Map<string, HostStat>());

  function record(url: string, method: string, origin: string): void {
    const info = classifyRequest(url, method, origin);
    total += 1;
    if (info.isUpload) uploads += 1;
    const key = info.host || '(relative)';
    const existing = byHost.get(key);
    if (existing) existing.count += 1;
    else byHost.set(key, { host: key, kind: info.kind, count: 1 });
  }

  return {
    get total() {
      return total;
    },
    /** Cross-origin write count — should always be 0. */
    get uploads() {
      return uploads;
    },
    /** Per-host stats, busiest first. */
    get hosts(): HostStat[] {
      return [...byHost.values()].sort((a, b) => b.count - a.count);
    },
    /** Hosts that aren't same-origin or a known model/asset CDN. */
    get unknownHosts(): HostStat[] {
      return this.hosts.filter((h) => h.kind === 'other');
    },

    /** Wrap fetch once (call on app mount, client-only). */
    install(): void {
      if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
      installed = true;
      const origin = window.location.origin;
      const original = window.fetch.bind(window);
      window.fetch = (input: RequestInfo | URL | string, init?: RequestInit) => {
        try {
          const url =
            typeof input === 'string'
              ? input
              : input instanceof URL
                ? input.href
                : (input as Request).url;
          const method =
            init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET');
          record(url, method, origin);
        } catch {
          // never let auditing break a real request
        }
        return original(input as RequestInfo | URL, init);
      };
    },
  };
}

export const networkAuditStore = createNetworkAuditStore();
