import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
const DISCORD_SERVER_ID = Deno.env.get("DISCORD_SERVER_ID");
const DISCORD_CHANNEL_IDS_RAW = Deno.env.get("DISCORD_CHANNEL_IDS") || "";
const TRACKED_TAGS = ["thrft", "thrftapp", "thrftairdrop", "@thrftapp"];
const PRESALE_KEYWORDS = ["presale", "thrft.app", "thrft.io"];

function getAccountTier(followers) {
  if (followers >= 250000) return 4;
  if (followers >= 50000) return 3;
  if (followers >= 10000) return 2;
  return 1;
}
function getTierMultiplier(tier) {
  return { 1: 1.0, 2: 1.75, 3: 2.5, 4: 3.5 }[tier] || 1.0;
}

function calculateDiscordPoints({ hasMedia, isThread, reactionsReceived, repliesReceived, tierMultiplier }) {
  let base = isThread ? 3 : hasMedia ? 2 : 1;
  let bonus = 0;
  bonus += (reactionsReceived || 0) * 0.5;
  bonus += (repliesReceived || 0) * 1;
  if (isThread && (repliesReceived || 0) >= 25) bonus += 25;
  const mediaMultiplier = (hasMedia && !isThread) ? 1.5 : 1.0;
  const total = (base + bonus) * tierMultiplier * mediaMultiplier;
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

async function discordFetch(endpoint) {
  const res = await fetch(`https://discord.com/api/v10${endpoint}`, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
  });
  if (res.status === 429) {
    const data = await res.json();
    await new Promise(r => setTimeout(r, (data.retry_after || 1) * 1000));
    return discordFetch(endpoint);
  }
  if (!res.ok) throw new Error(`Discord API error (${res.status}): ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!DISCORD_BOT_TOKEN || !DISCORD_SERVER_ID) {
      return Response.json({ error: 'DISCORD_BOT_TOKEN and DISCORD_SERVER_ID secrets required' }, { status: 400 });
    }

    const channelIds = DISCORD_CHANNEL_IDS_RAW.split(",").map(s => s.trim()).filter(Boolean);
    if (channelIds.length === 0) {
      return Response.json({ error: 'DISCORD_CHANNEL_IDS secret required' }, { status: 400 });
    }

    const socialProfiles = await base44.asServiceRole.entities.SocialProfile.filter({ platform: "discord" });
    const profilesByHandle = {};
    socialProfiles.forEach(p => {
      if (p.platform_handle) {
        profilesByHandle[p.platform_handle.toLowerCase()] = p;
        profilesByHandle[p.platform_handle.split("#")[0].toLowerCase()] = p;
      }
      if (p.platform_user_id) profilesByHandle[p.platform_user_id] = p;
    });

    const existingActivities = await base44.asServiceRole.entities.SocialActivity.filter({ platform: "discord" });
    const existingIds = new Set(existingActivities.map(a => a.content_id).filter(Boolean));

    let totalCreated = 0;
    const profileUpdates = {};

    for (const channelId of channelIds) {
      const messages = await discordFetch(`/channels/${channelId}/messages?limit=100`).catch(e => {
        console.error(`Discord channel ${channelId} error:`, e.message);
        return [];
      });

      for (const message of messages) {
        if (existingIds.has(message.id)) continue;
        if (message.author?.bot) continue;

        const text = message.content || "";
        const lowerText = text.toLowerCase();
        if (!TRACKED_TAGS.some(t => lowerText.includes(t))) continue;

        const username = message.author?.username?.toLowerCase();
        const userId = message.author?.id;
        if (!username) continue;

        const profile = profilesByHandle[username] || profilesByHandle[userId];
        if (!profile) continue;

        const hasMedia = (message.attachments?.length > 0) || (message.embeds?.length > 0);
        const isThread = !!message.thread;
        const reactionsReceived = message.reactions?.reduce((s, r) => s + (r.count || 0), 0) || 0;

        const tier = getAccountTier(profile.followers_count || 0);
        const tierMultiplier = getTierMultiplier(tier);
        const { base, bonus, total } = calculateDiscordPoints({ hasMedia, isThread, reactionsReceived, repliesReceived: 0, tierMultiplier });

        const trackedTag = TRACKED_TAGS.find(t => lowerText.includes(t)) || "thrft";

        await base44.asServiceRole.entities.SocialActivity.create({
          user_email: profile.user_email,
          platform: "discord",
          platform_handle: profile.platform_handle,
          action_type: "message",
          tracked_tag: trackedTag,
          content_id: message.id,
          content_text: text.substring(0, 500),
          has_media: hasMedia,
          has_presale_link: PRESALE_KEYWORDS.some(k => lowerText.includes(k)),
          likes_received: reactionsReceived,
          base_points: base,
          bonus_points: bonus,
          points_earned: total,
          activity_date: message.timestamp,
        });

        existingIds.add(message.id);
        totalCreated++;

        if (!profileUpdates[profile.id]) {
          profileUpdates[profile.id] = { profile, points: 0, post_count: 0 };
        }
        profileUpdates[profile.id].points += total;
        profileUpdates[profile.id].post_count += 1;
      }
    }

    for (const [profileId, upd] of Object.entries(profileUpdates)) {
      await base44.asServiceRole.entities.SocialProfile.update(profileId, {
        total_points: (upd.profile.total_points || 0) + upd.points,
        post_count: (upd.profile.post_count || 0) + upd.post_count,
        is_connected: true,
      });
    }

    return Response.json({ success: true, activities_created: totalCreated, profiles_updated: Object.keys(profileUpdates).length });
  } catch (error) {
    console.error("Discord sync error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});