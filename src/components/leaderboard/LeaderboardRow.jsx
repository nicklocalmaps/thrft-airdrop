import React from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LeaderboardRow({ profile, rank }) {
  const isTop3 = rank <= 3;

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl p-4 transition-all duration-200",
        isTop3 ? "bg-primary/5 border border-primary/10" : "bg-card border border-border hover:border-primary/10"
      )}
    >
      {/* Rank */}
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
          rank === 1 && "bg-yellow-500/10 text-yellow-500",
          rank === 2 && "bg-gray-400/10 text-gray-400",
          rank === 3 && "bg-orange-500/10 text-orange-500",
          rank > 3 && "bg-secondary text-muted-foreground"
        )}
      >
        {rank <= 3 ? <Trophy className="w-4 h-4" /> : rank}
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-foreground shrink-0">
          {profile.x_handle?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {profile.x_display_name || profile.x_handle}
          </p>
          <p className="text-xs text-muted-foreground">@{profile.x_handle}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-6 text-xs text-muted-foreground">
        <div className="text-center">
          <p className="font-semibold text-foreground">{profile.post_count || 0}</p>
          <p>Posts</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">{profile.repost_count || 0}</p>
          <p>Reposts</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">{profile.reply_count || 0}</p>
          <p>Replies</p>
        </div>
      </div>

      {/* Points */}
      <div className="text-right shrink-0">
        <p className="text-lg font-bold text-primary">{profile.total_points || 0}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Points</p>
      </div>
    </div>
  );
}