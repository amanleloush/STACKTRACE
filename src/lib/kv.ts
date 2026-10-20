// Minimal structural type for a Cloudflare Workers KV namespace binding —
// only the calls this codebase makes. Declared here (not pulled from
// @cloudflare/workers-types) so there's no extra dependency, and so tests
// can hand the routes an in-memory fake that satisfies it.

export interface KVPutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: unknown;
}

export interface KVNamespace {
  get(key: string, type?: 'text'): Promise<string | null>;
  get<T = unknown>(key: string, type: 'json'): Promise<T | null>;
  put(key: string, value: string, options?: KVPutOptions): Promise<void>;
}
