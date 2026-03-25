import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, Clock, XCircle, Loader2, Smartphone } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function AppDownloadClaim({ userEmail, xHandle }) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: claims } = useQuery({
    queryKey: ["downloadClaims", userEmail],
    queryFn: () => base44.entities.AppDownloadClaim.filter({ user_email: userEmail }),
    enabled: !!userEmail,
    initialData: [],
  });

  const { data: profiles } = useQuery({
    queryKey: ["profile", userEmail],
    queryFn: () => base44.entities.XProfile.filter({ user_email: userEmail }),
    enabled: !!userEmail,
    initialData: [],
  });

  const profile = profiles?.[0];
  const latestClaim = claims?.[0];

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image file", variant: "destructive" });
      return;
    }

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    await base44.entities.AppDownloadClaim.create({
      user_email: userEmail,
      x_handle: xHandle,
      screenshot_url: file_url,
      status: "pending",
      points_awarded: 1000,
    });

    toast({ title: "Screenshot submitted!", description: "An admin will review your claim shortly." });
    queryClient.invalidateQueries({ queryKey: ["downloadClaims", userEmail] });
    setUploading(false);
  };

  // Already verified
  if (profile?.app_download_verified) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-center gap-4">
        <div className="rounded-xl bg-primary/10 p-3">
          <CheckCircle2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">App Download Verified</p>
          <p className="text-xs text-muted-foreground">+1,000 bonus points awarded!</p>
        </div>
      </div>
    );
  }

  // Pending review
  if (latestClaim?.status === "pending") {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
        <div className="rounded-xl bg-secondary p-3">
          <Clock className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Screenshot Under Review</p>
          <p className="text-xs text-muted-foreground">An admin will verify your app download soon.</p>
        </div>
      </div>
    );
  }

  // Rejected — allow resubmit
  const isRejected = latestClaim?.status === "rejected";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-secondary p-3">
          <Smartphone className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">THRFT App Download Bonus</p>
          <p className="text-xs text-muted-foreground">
            {isRejected
              ? `Claim rejected${latestClaim.admin_note ? `: ${latestClaim.admin_note}` : ""}. Upload a new screenshot.`
              : "Upload a screenshot of your THRFT app download to earn 1,000 points."}
          </p>
        </div>
      </div>

      {isRejected && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2">
          <XCircle className="w-4 h-4 text-destructive" />
          <p className="text-xs text-destructive">Previous claim was rejected. You may resubmit.</p>
        </div>
      )}

      <label className="block">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <Button
          variant="outline"
          className="w-full gap-2 cursor-pointer"
          disabled={uploading}
          asChild
        >
          <span>
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? "Uploading..." : "Upload Screenshot"}
          </span>
        </Button>
      </label>
    </div>
  );
}