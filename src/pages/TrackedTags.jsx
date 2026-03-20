import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Hash, AtSign, Plus, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function TrackedTags() {
  const [newTag, setNewTag] = useState("");
  const [tagType, setTagType] = useState("hashtag");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tags, isLoading } = useQuery({
    queryKey: ["trackedTags"],
    queryFn: () => base44.entities.TrackedTag.list("-created_date"),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TrackedTag.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trackedTags"] });
      setNewTag("");
      toast({ title: "Tag Added", description: "Now tracking this tag." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TrackedTag.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trackedTags"] });
      toast({ title: "Tag Removed" });
    },
  });

  const handleAdd = () => {
    const cleanTag = newTag.replace(/^[#@]/, "").trim();
    if (!cleanTag) return;
    const prefix = tagType === "hashtag" ? "#" : "@";
    createMutation.mutate({
      tag: prefix + cleanTag,
      tag_type: tagType,
      is_active: true,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tracked Tags</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage which hashtags and mentions are being tracked for points
        </p>
      </div>

      {/* Add Form */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Add New Tag</h3>
        <div className="flex gap-3 flex-wrap">
          <Select value={tagType} onValueChange={setTagType}>
            <SelectTrigger className="w-36 bg-secondary border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hashtag"># Hashtag</SelectItem>
              <SelectItem value="mention">@ Mention</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder={tagType === "hashtag" ? "companyname" : "companyname"}
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            className="flex-1 min-w-[200px] bg-secondary border-0"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={createMutation.isPending || !newTag.trim()}>
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add Tag
          </Button>
        </div>
      </div>

      {/* Tags List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tags.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-16 text-center">
            <Hash className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No tags being tracked. Add your first one above!
            </p>
          </div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between hover:border-primary/10 transition-all"
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "rounded-xl p-3",
                    tag.tag_type === "hashtag"
                      ? "bg-primary/10 text-primary"
                      : "bg-chart-4/10 text-chart-4"
                  )}
                >
                  {tag.tag_type === "hashtag" ? (
                    <Hash className="w-5 h-5" />
                  ) : (
                    <AtSign className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{tag.tag}</p>
                  <Badge
                    variant="secondary"
                    className="text-[10px] mt-1"
                  >
                    {tag.tag_type}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(tag.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}