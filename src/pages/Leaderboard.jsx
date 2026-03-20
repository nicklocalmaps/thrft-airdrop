import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import LeaderboardRow from "@/components/leaderboard/LeaderboardRow";
import { Trophy } from "lucide-react";

export default function Leaderboard() {
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => base44.entities.XProfile.list("-total_points", 100),
    initialData: [],
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Top contributors ranked by engagement points
        </p>
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-16 text-center">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No participants yet. Be the first to connect your X account!
            </p>
          </div>
        ) : (
          profiles.map((profile, i) => (
            <LeaderboardRow key={profile.id} profile={profile} rank={i + 1} />
          ))
        )}
      </div>
    </div>
  );
}