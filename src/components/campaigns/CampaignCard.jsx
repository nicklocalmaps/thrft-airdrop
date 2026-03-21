import React from "react";
import { Edit2, Trash2, Play, Square, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";

const statusColors = {
  draft: "bg-secondary text-muted-foreground",
  active: "bg-primary/10 text-primary",
  ended: "bg-destructive/10 text-destructive",
};

export default function CampaignCard({ campaign, onEdit, onDelete, onStatusChange }) {
  const start = new Date(campaign.start_date);
  const end = new Date(campaign.end_date);
  const daysTotal = differenceInDays(end, start);
  const daysLeft = differenceInDays(end, new Date());

  return (
    <div className="rounded-2xl border border-border bg-card p-6 hover:border-primary/10 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{campaign.name}</h3>
            <Badge className={cn("text-[10px]", statusColors[campaign.status])}>
              {campaign.status}
            </Badge>
          </div>
          {campaign.description && (
            <p className="text-xs text-muted-foreground mt-1">{campaign.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(start, "MMM d")} – {format(end, "MMM d, yyyy")}
            </span>
            <span>{daysTotal} days total</span>
            {campaign.status === "active" && daysLeft > 0 && (
              <span className="text-primary font-medium">{daysLeft} days left</span>
            )}
            {campaign.goal_actions && (
              <span>Goal: {campaign.goal_actions.toLocaleString()} actions</span>
            )}
          </div>
          {campaign.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {campaign.hashtags.map((tag) => (
                <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {campaign.status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(campaign.id, "active")}
              className="gap-1 text-xs text-primary border-primary/20"
            >
              <Play className="w-3 h-3" /> Launch
            </Button>
          )}
          {campaign.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(campaign.id, "ended")}
              className="gap-1 text-xs"
            >
              <Square className="w-3 h-3" /> End
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => onEdit(campaign)}>
            <Edit2 className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(campaign.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}