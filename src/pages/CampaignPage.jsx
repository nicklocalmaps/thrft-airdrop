import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, Hash, AtSign, Trash2, Edit2, Play, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import CampaignForm from "@/components/campaigns/CampaignForm";
import CampaignCard from "@/components/campaigns/CampaignCard";

export default function CampaignPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list("-created_date"),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Campaign.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campaign deleted" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Campaign.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCampaign(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage engagement campaigns
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Campaign
        </Button>
      </div>

      {showForm && (
        <CampaignForm
          campaign={editingCampaign}
          onClose={handleFormClose}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["campaigns"] });
            handleFormClose();
          }}
        />
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-16 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No campaigns yet. Create your first one!</p>
          </div>
        ) : (
          campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={handleEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
              onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
            />
          ))
        )}
      </div>
    </div>
  );
}