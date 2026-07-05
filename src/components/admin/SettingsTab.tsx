"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { adminFetchSettings, adminAction, adminChangePassword } from "@/lib/api";
import { invalidateCache } from "@/lib/data";
import { LS_ADMIN_PASSWORD } from "@/lib/constants";
import type { Settings } from "@/lib/types";

export function SettingsTab({ onSaved }: { onSaved: () => void }) {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [shopName, setShopName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [tagline, setTagline] = useState("");
  const [quickPay, setQuickPay] = useState(true);

  // password change
  const [showPwCard, setShowPwCard] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    adminFetchSettings()
      .then((s) => {
        setSettings(s);
        setShopName(s.shop_name);
        setUpiId(s.upi_id);
        setTagline(s.tagline);
        setQuickPay(s.enable_quick_pay);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load settings"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!upiId.trim()) return toast.error("UPI ID is required");
    setSaving(true);
    try {
      await adminAction("update_settings", {
        shop_name: shopName.trim(),
        upi_id: upiId.trim(),
        tagline: tagline.trim(),
        enable_quick_pay: quickPay,
      });
      invalidateCache("settings");
      toast.success("Settings saved");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (newPw.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPw !== confirmPw) return toast.error("Passwords do not match");
    setSavingPw(true);
    try {
      await adminChangePassword(newPw);
      localStorage.setItem(LS_ADMIN_PASSWORD, newPw);
      toast.success("Password changed");
      setNewPw("");
      setConfirmPw("");
      setShowPwCard(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setSavingPw(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-md">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-md">
      {/* Shop settings */}
      <div className="bg-surface-container-lowest rounded-2xl p-lg shadow-sm border border-outline-variant/20 space-y-md">
        <h3 className="font-headline-md text-headline-md text-on-surface">Shop Settings</h3>
        <SettingInput label="Shop Name" value={shopName} onChange={setShopName} />
        <SettingInput label="UPI ID" value={upiId} onChange={setUpiId} mono placeholder="yourupi@bank" />
        <SettingInput label="Tagline" value={tagline} onChange={setTagline} placeholder="Enter custom tagline" />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={quickPay} onChange={(e) => setQuickPay(e.target.checked)} className="w-5 h-5 rounded accent-primary" />
          <span className="text-label-md text-on-surface">Enable Quick Pay (UPI deep link button)</span>
        </label>
        <button
          onClick={save}
          disabled={saving}
          className="w-full h-12 bg-primary-container text-on-primary-container rounded-full font-label-md flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
        >
          {saving ? <Spinner className="w-4 h-4" /> : <Icon name="save" />}
          Save Settings
        </button>
      </div>

      {/* Password */}
      <div className="bg-surface-container-lowest rounded-2xl p-lg shadow-sm border border-outline-variant/20 space-y-md">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface">Admin Password</h3>
          <button
            onClick={() => setShowPwCard((s) => !s)}
            className="text-info font-label-sm flex items-center gap-1"
          >
            <Icon name="key" className="text-sm" />
            {showPwCard ? "Cancel" : "Change"}
          </button>
        </div>

        {showPwCard && (
          <div className="space-y-sm">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="New password"
                className="w-full h-12 px-4 pr-12 bg-surface-container rounded-xl border border-transparent focus:border-primary outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              >
                <Icon name={showPw ? "visibility_off" : "visibility"} />
              </button>
            </div>
            <input
              type={showPw ? "text" : "password"}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Confirm new password"
              className="w-full h-12 px-4 bg-surface-container rounded-xl border border-transparent focus:border-primary outline-none"
            />
            <p className="text-label-sm text-on-surface-variant">
              Remember this password — you&apos;ll need it to access the admin panel.
            </p>
            <button
              onClick={changePassword}
              disabled={savingPw}
              className="w-full h-12 bg-info text-white rounded-full font-label-md flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
            >
              {savingPw ? <Spinner className="w-4 h-4" /> : <Icon name="lock_reset" />}
              Update Password
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingInput({
  label,
  value,
  onChange,
  mono,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="font-label-md text-label-md text-on-surface">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-12 px-4 bg-surface-container rounded-xl border border-transparent focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none ${
          mono ? "font-mono" : ""
        }`}
      />
    </div>
  );
}
