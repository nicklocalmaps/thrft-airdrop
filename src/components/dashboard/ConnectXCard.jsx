import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link2, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ConnectXCard({ profile, onConnected }) {
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState(""); // stored in XProfile
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    const cleanHandle = handle.replace("@", "").trim();
    if (!cleanHandle || !email.trim()) return;

    setLoading(true);
    const user = await base44.auth.me();

    // Check if profile already exists
    const existing = await base44.entities.XProfile.filter({ user_email: user.email });
    if (existing.length > 0) {
      await base44.entities.XProfile.update(existing[0].id, {
        x_handle: cleanHandle,
        is_connected: true,
        ...(email.trim() && { contact_email: email.trim() }),
      });
    } else {
      await base44.entities.XProfile.create({
        user_email: user.email,
        x_handle: cleanHandle,
        x_display_name: cleanHandle,
        is_connected: true,
        total_points: 0,
        post_count: 0,
        repost_count: 0,
        reply_count: 0,
        ...(email.trim() && { contact_email: email.trim() }),
      });
    }



    toast({ title: "X Account Connected", description: `@${cleanHandle} is now linked.` });
    setLoading(false);
    if (onConnected) onConnected();
  };

  if (profile?.is_connected) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">X Account Connected</p>
            <p className="text-xs text-muted-foreground">@{profile.x_handle}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-xl bg-secondary p-3">
          <Link2 className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Connect Your X Account</p>
          <p className="text-xs text-muted-foreground">
            Enter your X handle to start tracking engagement
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Input
          placeholder="@yourhandle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          className="bg-secondary border-0"
        />
        <Input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-secondary border-0"
        />
        <Button onClick={handleConnect} disabled={loading || !handle.trim() || !email.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
        </Button>
      </div>
    </div>
  );
}