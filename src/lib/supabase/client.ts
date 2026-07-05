"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client (anon key). Read-only access to public data + realtime.
// All mutations go through server routes with the service-role key.

let browserClient: SupabaseClient | null = null;

// True when real (non-placeholder) Supabase env vars are present.
export function isSupabaseConfiguredBrowser(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      anon &&
      !url.includes("YOUR-PROJECT") &&
      !anon.includes("your-anon") &&
      url.startsWith("http")
  );
}

export function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  browserClient = createClient(url, anon, {
    auth: { persistSession: false },
  });
  return browserClient;
}
