import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Send, Repeat2, MessageSquare, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import moment from "moment";

const actionIcons = {
  post: Send,
  repost: Repeat2,
  reply: MessageSquare,
};

const filters = [
  { label: "All", value: "all" },
  { label: "Posts", value: "post" },
  { label: "Reposts", value: "repost" },
  { label: "Replies", value: "reply" },
];

export default function ActivityPage() {
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: activities, isLoading } = useQuery({
    queryKey: ["allActivities"],
    queryFn: () => base44.entities.Activity.list("-created_date", 100),
    initialData: [],
  });

  const filtered =
    activeFilter === "all"
      ? activities
      : activities.filter((a) => a.action_type === activeFilter);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Activity Feed</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All tracked engagement across connected accounts
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={activeFilter === f.value ? "default" : "secondary"}
            size="sm"
            onClick={() => setActiveFilter(f.value)}
            className="rounded-full text-xs"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-16 text-center">
            <p className="text-sm text-muted-foreground">
              No activity found. Start engaging with tracked tags!
            </p>
          </div>
        ) : (
          filtered.map((activity) => {
            const Icon = actionIcons[activity.action_type] || Send;
            return (
              <div
                key={activity.id}
                className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4 hover:border-primary/10 transition-all"
              >
                <div
                  className={cn(
                    "rounded-xl p-3 shrink-0",
                    activity.action_type === "post" && "bg-primary/10 text-primary",
                    activity.action_type === "repost" && "bg-chart-2/10 text-chart-2",
                    activity.action_type === "reply" && "bg-chart-4/10 text-chart-4"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      @{activity.x_handle}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {activity.action_type === "post" && "posted about"}
                      {activity.action_type === "repost" && "reposted"}
                      {activity.action_type === "reply" && "replied to"}
                    </span>
                    <span className="text-xs font-medium text-primary">
                      {activity.tracked_tag}
                    </span>
                  </div>
                  {activity.tweet_text && (
                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                      {activity.tweet_text}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {activity.activity_date
                      ? moment(activity.activity_date).fromNow()
                      : moment(activity.created_date).fromNow()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-primary">+{activity.points_earned}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    points
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}