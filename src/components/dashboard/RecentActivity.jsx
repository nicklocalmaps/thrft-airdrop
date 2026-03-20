import React from "react";
import { MessageSquare, Repeat2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

const actionIcons = {
  post: Send,
  repost: Repeat2,
  reply: MessageSquare,
};

const actionLabels = {
  post: "Posted",
  repost: "Reposted",
  reply: "Replied",
};

export default function RecentActivity({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          No activity tracked yet. Connect your X account and start engaging!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {activities.slice(0, 8).map((activity) => {
          const Icon = actionIcons[activity.action_type] || Send;
          return (
            <div
              key={activity.id}
              className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-secondary/50"
            >
              <div
                className={cn(
                  "rounded-lg p-2",
                  activity.action_type === "post" && "bg-primary/10 text-primary",
                  activity.action_type === "repost" && "bg-chart-2/10 text-chart-2",
                  activity.action_type === "reply" && "bg-chart-4/10 text-chart-4"
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  @{activity.x_handle}{" "}
                  <span className="text-muted-foreground font-normal">
                    {actionLabels[activity.action_type]?.toLowerCase()}
                  </span>{" "}
                  <span className="text-primary">{activity.tracked_tag}</span>
                </p>
                {activity.tweet_text && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {activity.tweet_text}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-primary">+{activity.points_earned}</p>
                <p className="text-[10px] text-muted-foreground">
                  {activity.activity_date
                    ? moment(activity.activity_date).fromNow()
                    : moment(activity.created_date).fromNow()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}