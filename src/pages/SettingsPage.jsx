import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Send, Repeat2, MessageSquare, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const defaultPoints = [
  { action_type: "post", points: 10, description: "Points for a post containing a tracked tag", icon: Send },
  { action_type: "repost", points: 5, description: "Points for reposting a tracked post", icon: Repeat2 },
  { action_type: "reply", points: 3, description: "Points for replying to a tracked post", icon: MessageSquare },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pointValues, setPointValues] = useState({
    post: 10,
    repost: 5,
    reply: 3,
  });
  const [xHandle, setXHandle] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: configs } = useQuery({
    queryKey: ["pointConfigs"],
    queryFn: () => base44.entities.PointConfig.list(),
    initialData: [],
  });

  const { data: profiles } = useQuery({
    queryKey: ["myProfile"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.XProfile.filter({ user_email: user.email });
    },
    initialData: [],
  });

  useEffect(() => {
    if (configs.length > 0) {
      const vals = {};
      configs.forEach((c) => {
        vals[c.action_type] = c.points;
      });
      setPointValues((prev) => ({ ...prev, ...vals }));
    }
  }, [configs]);

  useEffect(() => {
    if (profiles?.[0]) {
      setXHandle(profiles[0].x_handle || "");
    }
  }, [profiles]);

  const savePoints = async () => {
    setSaving(true);
    for (const item of defaultPoints) {
      const existing = configs.find((c) => c.action_type === item.action_type);
      if (existing) {
        await base44.entities.PointConfig.update(existing.id, {
          points: pointValues[item.action_type],
        });
      } else {
        await base44.entities.PointConfig.create({
          action_type: item.action_type,
          points: pointValues[item.action_type],
          description: item.description,
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["pointConfigs"] });
    toast({ title: "Points Saved", description: "Point values updated successfully." });
    setSaving(false);
  };

  const saveHandle = async () => {
    setSaving(true);
    const user = await base44.auth.me();
    const cleanHandle = xHandle.replace("@", "").trim();
    if (profiles?.[0]) {
      await base44.entities.XProfile.update(profiles[0].id, { x_handle: cleanHandle, is_connected: true });
    } else {
      await base44.entities.XProfile.create({
        user_email: user.email,
        x_handle: cleanHandle,
        is_connected: true,
        total_points: 0,
        post_count: 0,
        repost_count: 0,
        reply_count: 0,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["myProfile"] });
    toast({ title: "Handle Updated" });
    setSaving(false);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your profile and point system
        </p>
      </div>

      {/* X Handle */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-secondary p-3">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">X Account</h3>
            <p className="text-xs text-muted-foreground">Your connected X handle</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Input
            placeholder="@yourhandle"
            value={xHandle}
            onChange={(e) => setXHandle(e.target.value)}
            className="bg-secondary border-0"
          />
          <Button onClick={saveHandle} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {/* Point Configuration */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
        <h3 className="text-sm font-semibold text-foreground">Point Values</h3>
        <p className="text-xs text-muted-foreground -mt-4">
          Set how many points each type of engagement earns
        </p>

        <div className="space-y-4">
          {defaultPoints.map((item) => (
            <div key={item.action_type} className="flex items-center gap-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium capitalize">{item.action_type}</Label>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Input
                type="number"
                min="0"
                value={pointValues[item.action_type]}
                onChange={(e) =>
                  setPointValues((prev) => ({
                    ...prev,
                    [item.action_type]: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-24 bg-secondary border-0 text-center"
              />
            </div>
          ))}
        </div>

        <Button onClick={savePoints} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Point Values
        </Button>
      </div>
    </div>
  );
}