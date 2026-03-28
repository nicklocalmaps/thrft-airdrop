import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function TikTokCallback() {
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [handle, setHandle] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");

    if (error || !code) {
      setErrorMsg(error || "No authorization code received from TikTok.");
      setStatus("error");
      return;
    }

    base44.functions.invoke("tiktokAuth", { code })
      .then((res) => {
        if (res.data?.success) {
          setHandle(res.data.handle || "");
          setStatus("success");
        } else {
          setErrorMsg(res.data?.error || "Unknown error");
          setStatus("error");
        }
      })
      .catch((err) => {
        setErrorMsg(err.message || "Failed to connect TikTok.");
        setStatus("error");
      });
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card rounded-3xl border border-border p-8 shadow-xl text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground">Connecting TikTok...</h2>
            <p className="text-sm text-muted-foreground mt-1">Please wait while we link your account.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground">TikTok Connected!</h2>
            {handle && <p className="text-sm text-muted-foreground mt-1">@{handle}</p>}
            <p className="text-sm text-muted-foreground mt-2">Your TikTok videos will now be tracked for points.</p>
            <Button asChild className="mt-6 w-full">
              <Link to="/">Go to Dashboard</Link>
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground">Connection Failed</h2>
            <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link to="/">Back to Dashboard</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}