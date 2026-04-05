import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Users, Gift, Link } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ReferralCard({ userEmail }) {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [refCode, setRefCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!userEmail) return;
    base44.functions.invoke("referral", { action: "get_code" })
      .then(res => setData(res.data))
      .catch(() => {});
  }, [userEmail]);

  const copyLink = () => {
    if (!data?.referral_link) return;
    navigator.clipboard.writeText(data.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitCode = async () => {
    if (!refCode.trim()) return;
    setSubmitting(true);
    const res = await base44.functions.invoke("referral", { action: "submit_code", referral_code: refCode.trim() });
    setSubmitting(false);
    if (res.data?.success) {
      setSubmitted(true);
      toast({ title: "Referral code applied!", description: `Your referrer earned ${res.data.points_awarded} points.` });
    } else {
      toast({ title: res.data?.error || "Failed to apply code", variant: "destructive" });
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-3">
          <Gift className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Referral Program</h3>
          <p className="text-xs text-muted-foreground">Earn 500 pts for every person you refer</p>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-secondary p-3 text-center">
            <p className="text-lg font-bold text-foreground">{data.confirmed_referrals}</p>
            <p className="text-[10px] text-muted-foreground">Confirmed</p>
          </div>
          <div className="rounded-xl bg-secondary p-3 text-center">
            <p className="text-lg font-bold text-foreground">{data.total_referrals}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="rounded-xl bg-secondary p-3 text-center">
            <p className="text-lg font-bold text-primary">{data.total_points_earned}</p>
            <p className="text-[10px] text-muted-foreground">Pts Earned</p>
          </div>
        </div>
      )}

      {/* Your referral link */}
      {data?.referral_link && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Your Referral Link</p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={data.referral_link}
              className="bg-secondary border-0 text-xs font-mono"
            />
            <Button variant="outline" size="icon" onClick={copyLink}>
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Enter a referral code */}
      {!submitted && (
        <div className="space-y-1.5 border-t border-border pt-4">
          <p className="text-xs font-medium text-foreground">Have a referral code?</p>
          <div className="flex gap-2">
            <Input
              placeholder="Paste referral code here"
              value={refCode}
              onChange={e => setRefCode(e.target.value)}
              className="bg-secondary border-0 text-xs"
            />
            <Button onClick={submitCode} disabled={submitting || !refCode.trim()} size="sm">
              Apply
            </Button>
          </div>
        </div>
      )}

      {submitted && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 border-t border-border pt-4">
          <Check className="w-4 h-4 text-green-500" />
          <p className="text-xs text-green-700 font-medium">Referral code applied!</p>
        </div>
      )}
    </div>
  );
}