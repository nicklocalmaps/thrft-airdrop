import React from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RankBadge({ rank }) {
  if (!rank || rank === 0) return null;
  const isTop3 = rank <= 3;
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold",
      rank === 1 && "bg-yellow-500/10 text-yellow-500",
      rank === 2 && "bg-gray-400/10 text-gray-400",
      rank === 3 && "bg-orange-500/10 text-orange-500",
      rank > 3 && "bg-secondary text-muted-foreground"
    )}>
      {isTop3 && <Trophy className="w-3.5 h-3.5" />}
      #{rank}
    </div>
  );
}