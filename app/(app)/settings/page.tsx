"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Bell, User, Shield, LogOut, ExternalLink } from "lucide-react";
import { useToast } from "@/lib/contexts/ToastContext";
import Link from "next/link";

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { success, error } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const currentUser = useQuery(api.users.getMe);
  const updateNotifPrefs = useMutation(api.users.updateNotificationPreferences);

  const prefs = currentUser?.notificationPreferences ?? {
    choreReminders: true,
    billReminders: true,
    lowStockAlerts: true,
    activityUpdates: true,
  };

  const handleToggle = async (key: keyof typeof prefs) => {
    try {
      await updateNotifPrefs({ ...prefs, [key]: !prefs[key] });
      success("Preferences updated!");
    } catch (e) {
      error(String(e));
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ redirectUrl: '/sign-in' });
  };

  const Toggle = ({
    enabled,
    onToggle,
  }: {
    enabled: boolean;
    onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        enabled ? "bg-indigo-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
          enabled ? "translate-x-4.5" : "translate-x-0.5"
        }`}
        style={{ transform: enabled ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Account and notification preferences.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <CardTitle>Profile</CardTitle>
          </div>
        </CardHeader>

        <div className="flex items-center gap-4">
          {user?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.imageUrl}
              alt={user.fullName ?? ""}
              className="w-14 h-14 rounded-full object-cover"
            />
          )}
          <div>
            <p className="font-semibold text-slate-900">{user?.fullName}</p>
            <p className="text-sm text-slate-500">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-500 mt-4">
          Manage your profile, avatar, and account settings through Clerk.
        </p>
        <a
          href="https://accounts.clerk.dev/user"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 mt-2 font-medium transition-colors"
        >
          Manage Account
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-400" />
            <CardTitle>Notifications</CardTitle>
          </div>
        </CardHeader>

        <div className="space-y-3">
          {[
            { key: "choreReminders", label: "Chore reminders", desc: "Get notified about due and overdue chores" },
            { key: "billReminders", label: "Bill reminders", desc: "Reminders when bills are due soon" },
            { key: "lowStockAlerts", label: "Low stock alerts", desc: "Notifications when inventory runs low" },
            { key: "activityUpdates", label: "Activity updates", desc: "When roommates complete chores or add items" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
              <Toggle
                enabled={prefs[key as keyof typeof prefs] ?? true}
                onToggle={() => handleToggle(key as keyof typeof prefs)}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Household settings link */}
      <Card>
        <CardHeader>
          <CardTitle>Household</CardTitle>
        </CardHeader>
        <p className="text-sm text-slate-500 mb-3">
          Manage your household preferences, invite codes, and member settings.
        </p>
        <Link href="/household">
          <Button variant="outline" size="sm" icon={ExternalLink} iconPosition="right">
            Go to Household Settings
          </Button>
        </Link>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-400" />
            <CardTitle>Privacy & Data</CardTitle>
          </div>
        </CardHeader>
        <p className="text-sm text-slate-500">
          Your data is stored securely on Convex and only accessible to members of your household.
          NARLA does not share your data with third parties.
        </p>
      </Card>

      {/* Sign out */}
      <Card>
        <Button
          variant="danger"
          onClick={handleSignOut}
          isLoading={isSigningOut}
          icon={LogOut}
          className="w-full justify-center"
        >
          {isSigningOut ? "Signing out..." : "Sign Out"}
        </Button>
      </Card>
    </div>
  );
}
