import { Icon } from "./Icon";

// Shown when Supabase env vars aren't configured yet, so the app never
// crashes with a raw error before it's wired up.
export function SetupNotice() {
  return (
    <div className="bg-secondary-fixed/40 border border-secondary-fixed-dim/50 rounded-3xl p-lg space-y-3">
      <div className="flex items-center gap-2">
        <Icon name="database" className="text-secondary text-2xl" fill />
        <h3 className="font-headline-md text-headline-md text-on-surface">Connect Supabase</h3>
      </div>
      <p className="text-on-surface-variant font-body-md">
        Almost there! Add your Supabase project keys to <code className="font-mono">.env.local</code>,
        then apply the SQL in <code className="font-mono">supabase/migrations/</code>.
      </p>
      <ol className="text-on-surface-variant text-label-md list-decimal list-inside space-y-1">
        <li>Create a project at supabase.com</li>
        <li>Copy the URL + anon + service_role keys into <code className="font-mono">.env.local</code></li>
        <li>Run <code className="font-mono">0001_init.sql</code> then <code className="font-mono">0002_seed.sql</code></li>
        <li>Restart the dev server</li>
      </ol>
      <p className="text-label-sm text-on-surface-variant">See README.md for full steps.</p>
    </div>
  );
}
