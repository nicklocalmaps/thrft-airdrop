import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { TrendingUp, Users, Zap, Hash } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { format, subDays, eachDayOfInterval } from "date-fns";

export default function AnalyticsPage() {
  const { data: activities } = useQuery({
    queryKey: ["allActivitiesAnalytics"],
    queryFn: () => base44.entities.Activity.list("-created_date", 5000),
    initialData: [],
  });

  const { data: profiles } = useQuery({
    queryKey: ["allProfilesAnalytics"],
    queryFn: () => base44.entities.XProfile.list("-total_points", 200),
    initialData: [],
  });

  const { data: tags } = useQuery({
    queryKey: ["trackedTags"],
    queryFn: () => base44.entities.TrackedTag.list(),
    initialData: [],
  });

  // Daily activity over last 30 days
  const last30Days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
  const dailyData = last30Days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayActivities = activities.filter((a) => {
      const d = new Date(a.activity_date || a.created_date);
      return format(d, "yyyy-MM-dd") === dayStr;
    });
    return {
      date: format(day, "MMM d"),
      posts: dayActivities.filter((a) => a.action_type === "post").length,
      reposts: dayActivities.filter((a) => a.action_type === "repost").length,
      replies: dayActivities.filter((a) => a.action_type === "reply").length,
      total: dayActivities.length,
    };
  });

  // Tag performance
  const tagPerformance = tags.map((tag) => {
    const tagActivities = activities.filter((a) => a.tracked_tag === tag.tag);
    const totalPoints = tagActivities.reduce((s, a) => s + (a.points_earned || 0), 0);
    return {
      tag: tag.tag,
      count: tagActivities.length,
      points: totalPoints,
      posts: tagActivities.filter((a) => a.action_type === "post").length,
      reposts: tagActivities.filter((a) => a.action_type === "repost").length,
      replies: tagActivities.filter((a) => a.action_type === "reply").length,
    };
  }).sort((a, b) => b.count - a.count);

  // Top users
  const topUsers = profiles.slice(0, 5);

  const totalActions = activities.length;
  const totalPoints = activities.reduce((s, a) => s + (a.points_earned || 0), 0);
  const activeUsers = profiles.filter((p) => (p.total_points || 0) > 0).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Campaign performance and engagement overview</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Actions" value={totalActions.toLocaleString()} icon={Zap} />
        <StatCard label="Total Points Awarded" value={totalPoints.toLocaleString()} icon={TrendingUp} />
        <StatCard label="Active Users" value={activeUsers} icon={Users} />
        <StatCard label="Tracked Tags" value={tags.length} icon={Hash} />
      </div>

      {/* Daily Activity Chart */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-6">Daily Activity (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dailyData} barSize={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              cursor={{ fill: "hsl(var(--secondary))" }}
            />
            <Bar dataKey="posts" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Posts" />
            <Bar dataKey="reposts" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} name="Reposts" />
            <Bar dataKey="replies" fill="hsl(var(--chart-4))" radius={[2, 2, 0, 0]} name="Replies" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tag Performance */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Tag Performance</h3>
        {tagPerformance.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No activity data yet.</p>
        ) : (
          <div className="space-y-3">
            {tagPerformance.map((tag) => (
              <div key={tag.tag} className="flex items-center gap-4">
                <div className="w-28 text-xs font-medium text-foreground truncate">{tag.tag}</div>
                <div className="flex-1 bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${tagPerformance[0].count > 0 ? (tag.count / tagPerformance[0].count) * 100 : 0}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground w-24 text-right">
                  {tag.count} actions · {tag.points} pts
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Contributors */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Top Contributors</h3>
        <div className="space-y-3">
          {topUsers.map((profile, i) => (
            <div key={profile.id} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">@{profile.x_handle}</p>
                <p className="text-xs text-muted-foreground">
                  {profile.post_count || 0} posts · {profile.repost_count || 0} reposts · {profile.reply_count || 0} replies
                </p>
              </div>
              <p className="text-sm font-bold text-primary">{(profile.total_points || 0).toLocaleString()} pts</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}