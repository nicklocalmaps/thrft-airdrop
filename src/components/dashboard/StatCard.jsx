import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ label, value, icon: Icon, trend, className }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/20",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {trend && (
            <p className="mt-1 text-xs font-medium text-primary">
              {trend}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-primary/10 p-3">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
    </div>
  );
}