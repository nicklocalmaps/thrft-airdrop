import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
const CHANNEL_IDS = (Deno.env.get("DISCORD_CHANNEL_IDS") || "").split(',').map(s => s.trim()).filter(Boolean);
const TRACKED_TAGS = ["THRFT", "THRFTapp", "THRFTairdrop", "thrft.app"];
const PRESALE_KEYWORDS = ["presale", "thrft.app"];

function getAccountTier(followers) {
  if (followers >= 250000) return 4;
  if (followers >= 50000) return 3;
  if (followers >= 10000) return 2;
  return 1;
}
function getTierMultiplier(tier) {
  return { 1: 1.0, 2: 1.75, 3: 2.5, 4: 3.5 }[tier] || 1.0;
}

function calculateDiscordPoints({ action_type, has_media, reactions_received, replies_received, tier_multiplier }) {
  let base = 0, bonus = 0;

  if (action_type === 'message') base = has_media ? 2 : 1;
  else if (action_type === 'thread') base = 3;
  else if (action_type === 'invite') base = 5;
  else if (action_type === 'active_invite') base = 10;

  bonus += (reactions_received || 0) * 0.5;
  bonus += (replies_received || 0) * 1;

  const total = (base + bonus) * (tier_multiplier || 1);
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

async function discordApi(path) {
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Discord API error (${path}): ${res.status} ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    if (!DISCORD_BOT_TOKEN || CHANNEL_IDS.length === 0) {
      return Response.json({ error: 'DISCORD_BOT_TOKEN and DISCORD_CHANNEL_IDS secrets are required.' }, { status: 400 });
    }

    // Load registered Discord profiles
    const socialProfiles = await base44.asServiceRole.entities.SocialProfile.filter({ platform: 'discord' });
    if (socialProfiles.length === 0) return Response.json({ message: 'No Discord profiles registered.' });

    const profilesByHandle = {};
    socialProfiles.forEach(p => {
      const key = p.platform_handle?.toLowerCase();
      if (key) profilesByHandle[key] = p;
    });

    const existing = await base44.asServiceRole.entities.SocialActivity.filter({ platform: 'discord' });
    const existingIds = new Set(existing.map(a => a.content_id).filter(Boolean));

    let totalCreated = 0;

    for (const channelId of CHANNEL_IDS) {
      const messages = await discordApi(`/channels/${channelId}/messages?limit=100`).catch(e => {
        console.error(`Channel ${channelId}:`, e.message);
        return [];
      });

      for (const msg of messages) {
        if (existingIds.has(msg.id)) continue;

        const text = msg.content || '';
        const hasThrftTag = TRACKED_TAGS.some(t => text.toLowerCase().includes(t.toLowerCase()));
        if (!hasThrftTag) continue;

        // Match by username#discriminator or just username
        const discordUsername = msg.author?.username?.toLowerCase();
        const discordTag = `${discordUsername}#${msg.author?.discriminator}`.toLowerCase();
        const profile = profilesByHandle[discordTag] || profilesByHandle[discordUsername];
        if (!profile) continue;

        const has_media = !!(msg.attachments?.length || msg.embeds?.length);
        const has_presale_link = PRESALE_KEYWORDS.some(k => text.toLowerCase().includes(k));
        const reactions_received = msg.reactions?.reduce((sum, r) => sum + (r.count || 0), 0) || 0;
        const is_thread_start = msg.thread != null;

        // Get XProfile for tier
        const xProfiles = await base44.asServiceRole.entities.XProfile.filter({ user_email: profile.user_email });
        const followers = xProfiles[0]?.followers_count || profile.followers_count || 0;
        const tier = getAccountTier(followers);
        const tier_multiplier = getTierMultiplier(tier);

        const action_type = is_thread_start ? 'thread' : 'message';
        const { base, bonus, total } = calculateDiscordPoints({
          action_type,
          has_media,
          reactions_received,
          replies_received: 0,
          tier_multiplier,
        });

        await base44.asServiceRole.entities.SocialActivity.create({
          user_email: profile.user_email,
          platform: 'discord',
          platform_handle: profile.platform_handle,
          action_type,
          tracked_tag: TRACKED_TAGS.find(t => text.toLowerCase().includes(t.toLowerCase())) || '#THRFT',
          content_id: msg.id,
          content_text: text.substring(0, 500),
          has_media,
          has_presale_link,
          likes_received: reactions_received,
          base_points: base,
          bonus_points: bonus,
          points_earned: total,
          activity_date: msg.timestamp,
        });

        await base44.asServiceRole.entities.SocialProfile.update(profile.id, {
          total_points: (profile.total_points || 0) + total,
          post_count: (profile.post_count || 0) + 1,
          account_tier: tier,
          multiplier: tier_multiplier,
        });

        existingIds.add(msg.id);
        totalCreated++;
      }
    }

    return Response.json({ success: true, platform: 'discord', activities_created: totalCreated });
  } catch (error) {
    console.error('Discord sync error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});