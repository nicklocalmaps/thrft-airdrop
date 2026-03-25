import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function AdminActivityPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    x_handle: "",
    action_type: "post",
    tracked_tag: "",
    tweet_id: "",
    conversation_id: "",
    tweet_text: "",
    has_media: false,
    has_presale_link: false,
    impression_count: 0,
    replies_received: 0,
    reposts_received: 0,
    bookmarks_received: 0,
    replied_to_handle: "",
    replied_to_followers: 0,
    activity_date: new Date().toISOString().slice(0, 16),
  });

  const { data: tags } = useQuery({
    queryKey: ["trackedTags"],
    queryFn: () => base44.entities.TrackedTag.filter({ is_active: true }),
    initialData: [],
  });

  const { data: activities } = useQuery({
    queryKey: ["recentActivities"],
    queryFn: () => base44.entities.Activity.list("-created_date", 50),
    initialData: [],
  });

  const handleSubmit = async () => {
    if (!form.x_handle || !form.tracked_tag) {
      toast({ title: "Handle and tag are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const res = await base44.functions.invoke("manualActivity", {
      ...form,
      activity_date: new Date(form.activity_date).toISOString(),
    });
    if (res.data?.success) {
      const { points_earned, base_points, bonus_points } = res.data;
      toast({ title: `Activity logged — ${points_earned} pts`, description: `Base: ${base_points} + Bonus: ${bonus_points}` });
      setForm((f) => ({ ...f, x_handle: "", tweet_id: "", tweet_text: "", impression_count: 0, replies_received: 0, reposts_received: 0, bookmarks_received: 0, has_media: false, has_presale_link: false }));
      queryClient.invalidateQueries({ queryKey: ["recentActivities"] });
      queryClient.invalidateQueries();
    } else {
      toast({ title: res.data?.error || "Failed", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Manual Activity Entry</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manually log activities and award points to users
        </p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>X Handle</Label>
            <Input
              placeholder="@username"
              value={form.x_handle}
              onChange={(e) => setForm((f) => ({ ...f, x_handle: e.target.value }))}
              className="bg-secondary border-0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Action Type</Label>
            <Select value={form.action_type} onValueChange={(v) => setForm((f) => ({ ...f, action_type: v }))}>
              <SelectTrigger className="bg-secondary border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="post">Post</SelectItem>
                <SelectItem value="thread">Thread</SelectItem>
                <SelectItem value="repost">Repost</SelectItem>
                <SelectItem value="quote_repost">Quote Repost</SelectItem>
                <SelectItem value="reply">Reply</SelectItem>
                <SelectItem value="bookmark">Bookmark</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tracked Tag</Label>
            <Select value={form.tracked_tag} onValueChange={(v) => setForm((f) => ({ ...f, tracked_tag: v }))}>
              <SelectTrigger className="bg-secondary border-0">
                <SelectValue placeholder="Select tag" />
              </SelectTrigger>
              <SelectContent>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.tag}>{t.tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tweet ID (optional)</Label>
            <Input
              placeholder="1234567890"
              value={form.tweet_id}
              onChange={(e) => setForm((f) => ({ ...f, tweet_id: e.target.value }))}
              className="bg-secondary border-0"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Tweet Text (optional)</Label>
            <Input
              placeholder="Tweet content for reference"
              value={form.tweet_text}
              onChange={(e) => setForm((f) => ({ ...f, tweet_text: e.target.value }))}
              className="bg-secondary border-0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Impression Count</Label>
            <Input
              type="number"
              placeholder="0"
              value={form.impression_count}
              onChange={(e) => setForm((f) => ({ ...f, impression_count: parseInt(e.target.value) || 0 }))}
              className="bg-secondary border-0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Replies Received</Label>
            <Input
              type="number"
              placeholder="0"
              value={form.replies_received}
              onChange={(e) => setForm((f) => ({ ...f, replies_received: parseInt(e.target.value) || 0 }))}
              className="bg-secondary border-0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reposts Received</Label>
            <Input
              type="number"
              placeholder="0"
              value={form.reposts_received}
              onChange={(e) => setForm((f) => ({ ...f, reposts_received: parseInt(e.target.value) || 0 }))}
              className="bg-secondary border-0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bookmarks Received</Label>
            <Input
              type="number"
              placeholder="0"
              value={form.bookmarks_received}
              onChange={(e) => setForm((f) => ({ ...f, bookmarks_received: parseInt(e.target.value) || 0 }))}
              className="bg-secondary border-0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Replied-To Account Followers</Label>
            <Input
              type="number"
              placeholder="0 (for reply bonus)"
              value={form.replied_to_followers}
              onChange={(e) => setForm((f) => ({ ...f, replied_to_followers: parseInt(e.target.value) || 0 }))}
              className="bg-secondary border-0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Activity Date</Label>
            <Input
              type="datetime-local"
              value={form.activity_date}
              onChange={(e) => setForm((f) => ({ ...f, activity_date: e.target.value }))}
              className="bg-secondary border-0"
            />
          </div>
          <div className="sm:col-span-2 flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_media}
                onChange={(e) => setForm((f) => ({ ...f, has_media: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-foreground">Has Media (+2 pts)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_presale_link}
                onChange={(e) => setForm((f) => ({ ...f, has_presale_link: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-foreground">Has Presale Link (+2 pts)</span>
            </label>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Log Activity & Award Points
        </Button>
      </div>

      {/* Recent manual activities preview */}
      <div className="space-y-3 max-w-2xl">
        <h3 className="text-sm font-semibold text-foreground">Recent Activities</h3>
        {activities.slice(0, 15).map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">@{a.x_handle}</p>
              <p className="text-xs text-muted-foreground">{a.action_type.replace("_", " ")} · {a.tracked_tag}</p>
              {a.tweet_text && <p className="text-xs text-muted-foreground truncate mt-0.5">{a.tweet_text}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-primary">+{a.points_earned}</p>
              {(a.bonus_points > 0) && <p className="text-[10px] text-chart-2">+{a.bonus_points} bonus</p>}
              <p className="text-[10px] text-muted-foreground">{moment(a.created_date).fromNow()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}