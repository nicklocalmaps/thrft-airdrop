import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Clock, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AdminClaimsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectNote, setRejectNote] = useState({});
  const [processing, setProcessing] = useState({});

  const { data: claims, isLoading } = useQuery({
    queryKey: ["allClaims"],
    queryFn: () => base44.entities.AppDownloadClaim.list("-created_date", 200),
    initialData: [],
  });

  const handleAction = async (claimId, action, note) => {
    setProcessing((p) => ({ ...p, [claimId]: true }));
    const res = await base44.functions.invoke("approveDownloadClaim", {
      claim_id: claimId,
      action,
      admin_note: note || null,
    });
    if (res.data?.success) {
      toast({ title: action === "approve" ? "Claim approved — 1,000 pts awarded!" : "Claim rejected" });
      queryClient.invalidateQueries({ queryKey: ["allClaims"] });
      queryClient.invalidateQueries();
    } else {
      toast({ title: res.data?.error || "Action failed", variant: "destructive" });
    }
    setProcessing((p) => ({ ...p, [claimId]: false }));
  };

  const pending = claims.filter((c) => c.status === "pending");
  const reviewed = claims.filter((c) => c.status !== "pending");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">App Download Claims</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve user app download screenshots (+1,000 pts each)
        </p>
      </div>

      {/* Pending */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-semibold text-foreground">Pending Review ({pending.length})</h3>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pending.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No pending claims.</p>
          </div>
        ) : (
          pending.map((claim) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              processing={processing[claim.id]}
              rejectNote={rejectNote[claim.id] || ""}
              onRejectNoteChange={(v) => setRejectNote((n) => ({ ...n, [claim.id]: v }))}
              onApprove={() => handleAction(claim.id, "approve")}
              onReject={() => handleAction(claim.id, "reject", rejectNote[claim.id])}
            />
          ))
        )}
      </div>

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Reviewed ({reviewed.length})</h3>
          {reviewed.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} reviewed />
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimCard({ claim, processing, rejectNote, onRejectNoteChange, onApprove, onReject, reviewed }) {
  const [showRejectInput, setShowRejectInput] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">@{claim.x_handle}</p>
          <p className="text-xs text-muted-foreground">{claim.user_email}</p>
          <p className="text-xs text-muted-foreground">{moment(claim.created_date).fromNow()}</p>
          {claim.admin_note && (
            <p className="text-xs text-destructive">Note: {claim.admin_note}</p>
          )}
        </div>
        <Badge className={statusColors[claim.status]}>
          {claim.status}
        </Badge>
      </div>

      {/* Screenshot */}
      <a href={claim.screenshot_url} target="_blank" rel="noopener noreferrer">
        <img
          src={claim.screenshot_url}
          alt="App download screenshot"
          className="w-full max-h-64 object-contain rounded-xl border border-border bg-secondary cursor-pointer hover:opacity-90 transition-opacity"
        />
      </a>

      {!reviewed && (
        <div className="space-y-3">
          {showRejectInput && (
            <Input
              placeholder="Rejection reason (optional)"
              value={rejectNote}
              onChange={(e) => onRejectNoteChange(e.target.value)}
              className="bg-secondary border-0 text-sm"
            />
          )}
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2"
              onClick={onApprove}
              disabled={processing}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve (+1,000 pts)
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={showRejectInput ? onReject : () => setShowRejectInput(true)}
              disabled={processing}
            >
              <XCircle className="w-4 h-4" />
              {showRejectInput ? "Confirm Reject" : "Reject"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}