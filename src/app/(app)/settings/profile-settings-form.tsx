"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/ui/form-message";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { safeJson } from "@/lib/safe-json";

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
];

interface ProfileSettingsFormProps {
  initialProfile: {
    email: string | null;
    name: string | null;
    image: string | null;
    bio: string | null;
    timezone: string | null;
  };
}

export function ProfileSettingsForm({ initialProfile }: ProfileSettingsFormProps) {
  const { update } = useSession();
  const [name, setName] = useState(initialProfile.name ?? "");
  const [image, setImage] = useState(initialProfile.image ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [timezone, setTimezone] = useState(initialProfile.timezone ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fallbackInitials = useMemo(() => {
    const value = name.trim() || initialProfile.email || "U";
    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return value.slice(0, 2).toUpperCase();
  }, [name, initialProfile.email]);

  function fillLocalTimezone() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setTimezone(tz);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          image,
          bio,
          timezone,
        }),
      });

      const data = await safeJson<{
        error?: string;
        user?: { name?: string | null; image?: string | null };
      }>(res);

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error ?? "Failed to update profile settings.",
        });
        return;
      }

      await update({
        name: data.user?.name ?? null,
        image: data.user?.image ?? null,
      });

      setMessage({ type: "success", text: "Profile updated." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update profile settings.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-secondary/30 p-4">
        <Avatar size="lg" className="ring-2 ring-background">
          <AvatarImage src={image || undefined} alt="Profile photo" />
          <AvatarFallback>{fallbackInitials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {name.trim() || "Your profile"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {initialProfile.email ?? "No email"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-name">Display Name</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Your name"
          disabled={loading}
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-photo-url">Profile Photo URL</Label>
        <Input
          id="profile-photo-url"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="https://example.com/photo.jpg"
          disabled={loading}
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="profile-timezone">Timezone</Label>
          <button
            type="button"
            onClick={fillLocalTimezone}
            className="text-xs text-primary hover:underline"
          >
            Use current timezone
          </button>
        </div>
        <Input
          id="profile-timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          list="common-timezones"
          placeholder="America/Chicago"
          disabled={loading}
          className="rounded-xl"
        />
        <datalist id="common-timezones">
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-bio">Bio</Label>
        <Textarea
          id="profile-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="Share your academic focus, goals, or study style."
          disabled={loading}
          className="rounded-xl"
        />
        <p className="text-xs text-muted-foreground">{bio.length}/280</p>
      </div>

      <Button type="submit" className="rounded-xl" disabled={loading}>
        {loading ? "Saving..." : "Save Profile"}
      </Button>

      {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
    </form>
  );
}
