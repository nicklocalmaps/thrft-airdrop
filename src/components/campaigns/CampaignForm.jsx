import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DURATION_PRESETS = [
  { label: "2 Weeks", days: 14 },
  { label: "30 Days", days: 30 },
  { label: "6 Weeks", days: 42 },
  { label: "60 Days", days: 60 },
  { label: "90 Days", days: 90 },
];

export default function CampaignForm({ campaign, onClose, onSaved }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [form, setForm] = useState({
    name: campaign?.name || "",
    description: campaign?.description || "",
    start_date: campaign?.start_date ? campaign.start_date.slice(0, 16) : new Date().toISOString().slice(0, 16),
    end_date: campaign?.end_date ? campaign.end_date.slice(0, 16) : "",
    hashtags: campaign?.hashtags || [],
    goal_actions: campaign?.goal_actions || "",
  });

  const applyPreset = (days) => {
    const start = new Date(form.start_date || Date.now());
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    setForm((f) => ({ ...f, end_date: end.toISOString().slice(0, 16) }));
  };

  const addTag = () => {
    const clean = tagInput.trim();
    if (!clean) return;
    const formatted = clean.startsWith("#") || clean.startsWith("@") ? clean : `#${clean}`;
    if (!form.hashtags.includes(formatted)) {
      setForm((f) => ({ ...f, hashtags: [...f.hashtags, formatted] }));
    }
    setTagInput("");
  };

  const removeTag = (tag) => {
    setForm((f) => ({ ...f, hashtags: f.hashtags.filter((t) => t !== tag) }));
  };

  const handleSave = async () => {
    if (!form.name || !form.start_date || !form.end_date) {
      toast({ title: "Please fill in name, start date, and end date.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
      goal_actions: form.goal_actions ? Number(form.goal_actions) : null,
    };
    if (campaign) {
      await base44.entities.Campaign.update(campaign.id, payload);
    } else {
      await base44.entities.Campaign.create({ ...payload, status: "draft" });
    }
    toast({ title: campaign ? "Campaign updated" : "Campaign created" });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {campaign ? "Edit Campaign" : "New Campaign"}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-1.5">
          <Label>Campaign Name</Label>
          <Input
            placeholder="e.g. Summer Engagement Drive"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="bg-secondary border-0"
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <Label>Description</Label>
          <Textarea
            placeholder="What is this campaign about?"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="bg-secondary border-0 h-20"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Start Date</Label>
          <Input
            type="datetime-local"
            value={form.start_date}
            onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            className="bg-secondary border-0"
          />
        </div>

        <div className="space-y-1.5">
          <Label>End Date</Label>
          <Input
            type="datetime-local"
            value={form.end_date}
            onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            className="bg-secondary border-0"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {DURATION_PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => applyPreset(p.days)}
                className="text-xs px-2 py-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Goal (total actions)</Label>
          <Input
            type="number"
            placeholder="e.g. 10000"
            value={form.goal_actions}
            onChange={(e) => setForm((f) => ({ ...f, goal_actions: e.target.value }))}
            className="bg-secondary border-0"
          />
        </div>
      </div>

      {/* Hashtags */}
      <div className="space-y-2">
        <Label>Tracked Hashtags & Mentions</Label>
        <div className="flex gap-2">
          <Input
            placeholder="#hashtag or @mention"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            className="bg-secondary border-0"
          />
          <Button variant="secondary" onClick={addTag} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {form.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {form.hashtags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
              >
                {tag}
                <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {campaign ? "Save Changes" : "Create Campaign"}
        </Button>
      </div>
    </div>
  );
}