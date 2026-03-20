import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSync = async () => {
    setLoading(true);
    setDone(false);
    const res = await base44.functions.invoke("syncXEngagement", {});
    const data = res.data;
    if (data?.success) {
      toast({
        title: "Sync Complete",
        description: `${data.activities_created} new activities found across ${data.tags_synced} tags.`,
      });
      queryClient.invalidateQueries();
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } else {
      toast({
        title: "Sync Failed",
        description: data?.error || "Something went wrong.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={loading}
      className="gap-2"
    >
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-primary" />
      ) : (
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
      )}
      {loading ? "Syncing..." : done ? "Synced!" : "Sync Now"}
    </Button>
  );
}