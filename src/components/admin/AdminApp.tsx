"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { adminLogin } from "@/lib/api";
import { isSupabaseConfiguredBrowser } from "@/lib/supabase/client";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { LS_ADMIN_AUTHED, LS_ADMIN_PASSWORD, APP_NAME } from "@/lib/constants";
import { AdminDashboard } from "./AdminDashboard";

export function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = checking
  const toast = useToast();

  useEffect(() => {
    setAuthed(localStorage.getItem(LS_ADMIN_AUTHED) === "true");
  }, []);

  function onLogout() {
    localStorage.removeItem(LS_ADMIN_AUTHED);
    localStorage.removeItem(LS_ADMIN_PASSWORD);
    setAuthed(false);
    toast.info("Logged out");
  }

  if (!isSupabaseConfiguredBrowser()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-container-margin">
        <div className="w-full max-w-md">
          <SetupNotice />
        </div>
      </div>
    );
  }

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-primary">
        <Spinner />
      </div>
    );
  }

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }

  return <AdminDashboard onLogout={onLogout} />;
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const toast = useToast();

  async function submit() {
    if (!password) return;
    setLoading(true);
    try {
      await adminLogin(password);
      localStorage.setItem(LS_ADMIN_AUTHED, "true");
      localStorage.setItem(LS_ADMIN_PASSWORD, password);
      toast.success("Welcome back!");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-container-margin">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-3xl p-lg shadow-lg border border-outline-variant/20 space-y-md">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-container/15 flex items-center justify-center">
            <Icon name="admin_panel_settings" className="text-3xl text-primary" fill />
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface mt-2">Admin Login</h1>
          <p className="text-on-surface-variant text-label-sm">{APP_NAME}</p>
        </div>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Password"
            autoFocus
            className="w-full h-12 px-4 pr-12 bg-surface-container rounded-xl border border-transparent focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          >
            <Icon name={show ? "visibility_off" : "visibility"} />
          </button>
        </div>
        <button
          onClick={submit}
          disabled={loading || !password}
          className="w-full h-12 bg-primary-container text-on-primary-container rounded-full font-label-md flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
        >
          {loading ? <Spinner className="w-4 h-4" /> : <Icon name="login" />}
          {loading ? "Checking..." : "Login"}
        </button>
        <Link
          href="/"
          className="block text-center text-on-surface-variant text-label-sm hover:text-primary"
        >
          ← Back to shop
        </Link>
      </div>
    </div>
  );
}
