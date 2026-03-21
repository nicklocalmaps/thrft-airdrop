import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Star, Send, Repeat2, MessageSquare, TrendingUp } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import ConnectXCard from "@/components/dashboard/ConnectXCard";
import SyncButton from "@/components/dashboard/SyncButton";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => setUserEmail(u.email));
  }, []);

  const { data: profiles, refetch: refetchProfiles } = useQuery({
    queryKey: ["xprofile", userEmail],
    queryFn: () => base44.entities.XProfile.filter({ user_email: userEmail }),
    enabled: !!userEmail,
    initialData: [],
    onSuccess: (data) => {
      if (data.length === 0 || !data[0]?.onboarding_complete) {
        setShowOnboarding(true);
      }
    },
  });

  const profile = profiles?.[0] || null;

  const { data: activities } = useQuery({
    queryKey: ["activities", userEmail],
    queryFn: () =>
      base44.entities.Activity.filter(
        { user_email: userEmail },
        "-created_date",
        10
      ),
    enabled: !!userEmail,
    initialData: [],
  });

  const { data: allProfiles } = useQuery({
    queryKey: ["allProfiles"],
    queryFn: () => base44.entities.XProfile.list("-total_points", 50),
    initialData: [],
  });

  // Find current user's rank
  const rank = allProfiles.findIndex((p) => p.user_email === userEmail) + 1;

  return (
    <div className="space-y-8">
      {showOnboarding && userEmail && (
        <OnboardingWizard
          userEmail={userEmail}
          onComplete={() => {
            setShowOnboarding(false);
            refetchProfiles();
          }}
        />
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your X engagement and earn points
          </p>
        </div>
        <SyncButton />
      </div>

      {/* Connect Card */}
      <ConnectXCard profile={profile} onConnected={refetchProfiles} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Points"
          value={profile?.total_points || 0}
          icon={Star}
        />
        <StatCard
          label="Rank"
          value={rank > 0 ? `#${rank}` : "—"}
          icon={TrendingUp}
        />
        <StatCard
          label="Posts"
          value={profile?.post_count || 0}
          icon={Send}
        />
        <StatCard
          label="Reposts"
          value={profile?.repost_count || 0}
          icon={Repeat2}
        />
        <StatCard
          label="Replies"
          value={profile?.reply_count || 0}
          icon={MessageSquare}
        />
      </div>

      {/* Recent Activity */}
      <RecentActivity activities={activities} />
    </div>
  );
}