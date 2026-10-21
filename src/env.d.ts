/// <reference path="../.astro/types.d.ts" />

import type { SessionUser, Session } from '~/lib/auth/session';
import type { CollectionEntry } from 'astro:content';

declare global {
  namespace App {
    interface Locals {
      user: SessionUser | null;
      session: Session | null;
      /** Set by /learn/notes/[slug] + /learn/dsa/[slug] before rendering
       *  MDX, so <Premium> blocks can look up their parent note. */
      entry?: CollectionEntry<'notes'> | CollectionEntry<'dsa'> | null;
      runtime?: {
        env?: {
          DB?: import('~/lib/db').D1Database;
          /** Workers KV (wrangler.toml `kv_namespaces`), e.g. problem progress. */
          KV?: import('~/lib/kv').KVNamespace;
          /** Secret (`wrangler secret put ANTHROPIC_API_KEY`) for the /mock/
           *  AI feedback endpoint. Unset → that endpoint returns 503. */
          ANTHROPIC_API_KEY?: string;
          /** Optional var: AI gradings per user per UTC day (default 5). */
          AI_DAILY_LIMIT?: string;
        };
      };
    }
  }
}

interface ImportMetaEnv {
  readonly GOOGLE_CLIENT_ID?: string;
  readonly GOOGLE_CLIENT_SECRET?: string;
  readonly SITE_URL?: string;
  readonly ADMIN_EMAILS?: string;
  readonly DEV_AUTH_BACKDOOR?: string;
  readonly SITE_SLUG?: string;
  readonly RAZORPAY_KEY_ID?: string;
  readonly RAZORPAY_KEY_SECRET?: string;
  readonly RAZORPAY_PLAN_ID?: string;
  readonly RAZORPAY_WEBHOOK_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
