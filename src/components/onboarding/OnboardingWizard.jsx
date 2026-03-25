import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ChevronRight, Hash, Star, User, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Connect Your X Account", icon: User },
  { id: 2, title: "Tracked Hashtags", icon: Hash },
  { id: 3, title: "How Points Work", icon: Star },
];

export default function OnboardingWizard({ userEmail, onComplete }) {
  const [step, setStep] = useState(1);
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const { data: tags } = useQuery({
    queryKey: ["trackedTags"],
    queryFn: () => base44.entities.TrackedTag.filter({ is_active: true }),
    initialData: [],
  });

  const { data: pointConfigs } = useQuery({
    queryKey: ["pointConfigs"],
    queryFn: () => base44.entities.PointConfig.list(),
    initialData: [],
  });

  const handleConnectX = async () => {
    if (!handle.trim()) return;
    setSaving(true);
    const cleanHandle = handle.replace("@", "").trim();
    const existing = await base44.entities.XProfile.filter({ user_email: userEmail });
    if (existing.length > 0) {
      await base44.entities.XProfile.update(existing[0].id, {
        x_handle: cleanHandle,
        is_connected: true,
        followers_count: followers ? parseInt(followers) : 0,
        onboarding_complete: false,
      });
    } else {
      await base44.entities.XProfile.create({
        user_email: userEmail,
        x_handle: cleanHandle,
        x_display_name: cleanHandle,
        is_connected: true,
        followers_count: followers ? parseInt(followers) : 0,
        total_points: 0,
        post_count: 0,
        repost_count: 0,
        reply_count: 0,
        onboarding_complete: false,
      });
    }
    // Send notification email to admin
    await base44.functions.invoke("notifyNewConnection", {
      x_handle: cleanHandle,
      email,
      app_user_email: userEmail,
    });

    setSaving(false);
    setStep(2);
  };

  const handleFinish = async () => {
    setSaving(true);
    const profiles = await base44.entities.XProfile.filter({ user_email: userEmail });
    if (profiles[0]) {
      await base44.entities.XProfile.update(profiles[0].id, { onboarding_complete: true });
    }
    setSaving(false);
    onComplete();
  };

  // Fixed base points per whitepaper
  const pts = { post: 2, thread: 2, repost: 1.5, quote_repost: 2, reply: 1, bookmark: 1.5 };

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card rounded-3xl border border-border p-8 shadow-2xl">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                step >= s.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}>
                {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("h-0.5 w-8 transition-all", step > s.id ? "bg-primary" : "bg-border")} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Connect X */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Connect Your X Account</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter your X handle to start earning points</p>
            </div>
            <div className="space-y-3">
              <Input
                placeholder="@yourhandle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="bg-secondary border-0"
                onKeyDown={(e) => e.key === "Enter" && handleConnectX()}
              />
              <Input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary border-0"
              />
              <Input
                type="number"
                placeholder="Followers count (for multiplier bonuses)"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                className="bg-secondary border-0"
              />
            </div>
            <Button className="w-full" onClick={handleConnectX} disabled={saving || !handle.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 2: Tracked Tags */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Hash className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">What's Being Tracked</h2>
              <p className="text-sm text-muted-foreground mt-1">Use these tags in your posts to earn points</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags configured yet.</p>
              ) : tags.map((tag) => (
                <span key={tag.id} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {tag.tag}
                </span>
              ))}
            </div>
            <Button className="w-full" onClick={() => setStep(3)}>
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 3: Points */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">How Points Work</h2>
              <p className="text-sm text-muted-foreground mt-1">Earn points for every engagement</p>
            </div>
            <div className="space-y-3">
              {[
                { label: "Post / Thread mentioning THRFT", pts: pts.post },
                { label: "Quote Repost", pts: pts.quote_repost },
                { label: "Repost", pts: pts.repost },
                { label: "Reply", pts: pts.reply },
                { label: "Bookmark", pts: pts.bookmark },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl bg-secondary p-3">
                  <span className="text-sm text-foreground">{item.label}</span>
                  <span className="text-sm font-bold text-primary">+{item.pts} pts</span>
                </div>
              ))}
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">⚡ Account Tier Multipliers</p>
                <p>Tier 1 (&lt;10k followers) → 1x</p>
                <p>Tier 2 (10k–50k followers) → 1.75x</p>
                <p>Tier 3 (50k–250k followers) → 2.5x</p>
                <p>Tier 4 (250k+ followers) → 3.5x</p>
              </div>
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">🚀 Bonus Points</p>
                <p>Include media → +2 pts</p>
                <p>Include presale link → +2 pts</p>
                <p>Thread → +3 bonus pts</p>
                <p>1,000+ views → +5 pts | 10k+ → +30 pts</p>
              </div>
            </div>
            <Button className="w-full" onClick={handleFinish} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Get Started!
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}