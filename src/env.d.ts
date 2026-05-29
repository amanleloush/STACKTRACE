/// <reference path="../.astro/types.d.ts" />

import type { SessionUser, Session } from '~/lib/auth/session';

declare global {
  namespace App {
    interface Locals {
      user: SessionUser | null;
      session: Session | null;
      runtime?: {
        env?: {
          DB?: import('~/lib/db').D1Database;
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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
