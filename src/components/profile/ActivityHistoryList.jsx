import React, { useState } from "react";
import { Send, Repeat2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const actionIcons = { post: Send, repost: Repeat2, reply: MessageSquare };
const actionLabels = { post: "Post", repost: "Repost", reply: "Reply" };
const actionColors = {
  post: "bg-primary/10 text-primary",
  repost: "bg-chart-2/10 text-chart-2",
  reply: "bg-chart-4/10 text-chart-4",
};

export default function ActivityHistoryList({ activities }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const total = activities?.length || 0;
  const paginated = activities?.slice(0, page * pageSize) || [];

  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">No activity history yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Point History & Audit Log</h3>
      <div className="space-y-2">
        {paginated.map((activity) => {
          const Icon = actionIcons[activity.action_type] || Send;
          const date = activity.activity_date || activity.created_date;
          return (
            <div
              key={activity.id}
              className="flex items-center gap-3 rounded-xl p-3 hover:bg-secondary/30 transition-colors"
            >
              <div className={cn("rounded-lg p-2 shrink-0", actionColors[activity.action_type])}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-foreground">
                    {actionLabels[activity.action_type]}
                  </span>
                  <span className="text-xs text-primary">{activity.tracked_tag}</span>
                  {activity.tweet_id && (
                    <a
                      href={`https://x.com/i/web/status/${activity.tweet_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-muted-foreground hover:text-primary underline"
                    >
                      View tweet
                    </a>
                  )}
                </div>
                {activity.tweet_text && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {activity.tweet_text}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {date ? format(new Date(date), "MMM d, yyyy · h:mm a") : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-primary">+{activity.points_earned}</p>
                <p className="text-[10px] text-muted-foreground">pts</p>
              </div>
            </div>
          );
        })}
      </div>
      {page * pageSize < total && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground text-center py-2"
        >
          Load more ({total - page * pageSize} remaining)
        </button>
      )}
    </div>
  );
}