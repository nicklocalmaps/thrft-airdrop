import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Repeat2, MessageSquare, Star, TrendingUp, Trophy, Zap, Quote, Bookmark, AlignLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import StatCard from "@/components/dashboard/StatCard";
import ActivityHistoryList from "@/components/profile/ActivityHistoryList";
import RankBadge from "@/components/profile/RankBadge";
import AppDownloadClaim from "@/components/referral/AppDownloadClaim";

export default function ProfilePage() {
  const [userEmail, setUserEmail] = useState(null);
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then((u) => setUserEmail(u.email));
  }, []);

  const { data: profiles, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", userEmail],
    queryFn: () => base44.entities.XProfile.filter({ user_email: userEmail }),
    enabled: !!userEmail,
    initialData: [],
  });

  const { data: activities } = useQuery({
    queryKey: ["profileActivities", userEmail],
    queryFn: () => base44.entities.Activity.filter({ user_email: userEmail }, "-created_date", 200),
    enabled: !!userEmail,
    initialData: [],
  });

  const { data: allProfiles } = useQuery({
    queryKey: ["allProfiles"],
    queryFn: () => base44.entities.XProfile.list("-total_points", 200),
    initialData: [],
  });

  const profile = profiles?.[0] || null;
  const rank = allProfiles.findIndex((p) => p.user_email === userEmail) + 1;

  useEffect(() => {
    if (profile) {
      setHandle(profile.x_handle || "");
      setFollowers(profile.followers_count?.toString() || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!handle.trim()) return;
    setSaving(true);
    const cleanHandle = handle.replace("@", "").trim();
    const payload = {
      x_handle: cleanHandle,
      is_connected: true,
      followers_count: followers ? parseInt(followers) : 0,
    };
    if (profile) {
      await base44.entities.XProfile.update(profile.id, payload);
    } else {
      await base44.entities.XProfile.create({
        ...payload,
        user_email: userEmail,
        x_display_name: cleanHandle,
        total_points: 0,
        post_count: 0,
        repost_count: 0,
        reply_count: 0,
      });
    }
    toast({ title: "Profile updated" });
    refetchProfile();
    queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
    setSaving(false);
  };

  // Multiplier info
  const followers_count = profile?.followers_count || 0;
  let multiplierLabel = "1x (Standard)";
  let multiplierColor = "text-muted-foreground";
  if (followers_count >= 100000) { multiplierLabel = "4x (100k+ followers)"; multiplierColor = "text-yellow-500"; }
  else if (followers_count >= 50000) { multiplierLabel = "3x (50k+ followers)"; multiplierColor = "text-orange-400"; }
  else if (followers_count >= 25000) { multiplierLabel = "2x (25k+ followers)"; multiplierColor = "text-blue-400"; }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your X account and view your stats</p>
      </div>

      {/* Profile Settings */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">X Account</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>X Handle</Label>
            <Input
              placeholder="@yourhandle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="bg-secondary border-0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Followers Count (for multiplier)</Label>
            <Input
              type="number"
              placeholder="e.g. 50000"
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
              className="bg-secondary border-0"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Point Multiplier:</p>
            <p className={cn("text-sm font-semibold", multiplierColor)}>
              <Zap className="w-3 h-3 inline mr-1" />
              {multiplierLabel}
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving || !handle.trim()}>
            Save Profile
          </Button>
        </div>
      </div>

      {/* Stats */}
      {profile && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Points" value={profile.total_points || 0} icon={Star} />
          <StatCard label="Rank" value={rank > 0 ? `#${rank}` : "—"} icon={Trophy} />
          <StatCard label="Posts" value={profile.post_count || 0} icon={Send} />
          <StatCard label="Reposts" value={profile.repost_count || 0} icon={Repeat2} />
        </div>
      )}

      {/* Activity History */}
      <ActivityHistoryList activities={activities} />
    </div>
  );
}