import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_GROUP_ID = Deno.env.get("TELEGRAM_GROUP_ID");
const TRACKED_TAGS = ["thrft", "thrftapp", "thrftairdrop", "@thrftapp"];
const PRESALE_KEYWORDS = ["presale", "thrft.app", "thrft.io"];

function getAccountTier(members) {
  if (members >= 250000) return 4;
  if (members >= 50000) return 3;
  if (members >= 10000) return 2;
  return 1;
}
function getTierMultiplier(tier) {
  return { 1: 1.0, 2: 1.75, 3: 2.5, 4: 3.5 }[tier] || 1.0;
}
function getImpressionBonus(views) {
  if (views >= 1000000) return 1000;
  if (views >= 100000) return 250;
  if (views >= 50000) return 100;
  if (views >= 10000) return 25;
  if (views >= 1000) return 5;
  return 0;
}

function calculateTelegramPoints({ hasMedia, hasPresaleLink, reactionsReceived, repliesReceived, views, tierMultiplier }) {
  let base = hasPresaleLink ? 3 : hasMedia ? 2 : 1;
  let bonus = 0;
  bonus += (reactionsReceived || 0) * 0.5;
  bonus += (repliesReceived || 0) * 1;
  bonus += getImpressionBonus(views || 0);
  if ((views || 0) >= 100 || (reactionsReceived || 0) >= 100) bonus += 20;
  const mediaMultiplier = hasMedia ? 1.5 : 1.0;
  const total = (base + bonus) * tierMultiplier * mediaMultiplier;
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

async function tgRequest(method, params = {}) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Telegram API error (${res.status}): ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_GROUP_ID) {
      return Response.json({ error: 'TELEGRAM_BOT_TOKEN and TELEGRAM_GROUP_ID secrets required' }, { status: 400 });
    }

    const socialProfiles = await base44.asServiceRole.entities.SocialProfile.filter({ platform: "telegram" });
    const profilesByHandle = {};
    socialProfiles.forEach(p => {
      if (p.platform_handle) profilesByHandle[p.platform_handle.toLowerCase().replace("@", "")] = p;
    });

    const existingActivities = await base44.asServiceRole.entities.SocialActivity.filter({ platform: "telegram" });
    const existingIds = new Set(existingActivities.map(a => a.content_id).filter(Boolean));

    const updatesData = await tgRequest("getUpdates", { limit: 100, allowed_updates: ["message", "channel_post"] });
    if (!updatesData.ok) {
      return Response.json({ error: "Failed to fetch Telegram updates" }, { status: 500 });
    }

    let chatMemberCount = 0;
    try {
      const chatData = await tgRequest("getChatMemberCount", { chat_id: TELEGRAM_GROUP_ID });
      chatMemberCount = chatData.result || 0;
    } catch (e) {
      console.warn("Could not fetch member count:", e.message);
    }

    let totalCreated = 0;
    const profileUpdates = {};

    for (const update of (updatesData.result || [])) {
      const message = update.message || update.channel_post;
      if (!message) continue;

      if (String(message.chat?.id) !== String(TELEGRAM_GROUP_ID)) continue;

      const messageId = String(message.message_id);
      if (existingIds.has(messageId)) continue;

      const text = message.text || message.caption || "";
      const lowerText = text.toLowerCase();
      if (!TRACKED_TAGS.some(t => lowerText.includes(t))) continue;

      const username = message.from?.username?.toLowerCase();
      if (!username) continue;

      const profile = profilesByHandle[username];
      if (!profile) continue;

      const hasMedia = !!(message.photo || message.video || message.animation || message.document);
      const hasPresaleLink = PRESALE_KEYWORDS.some(k => lowerText.includes(k));
      const views = message.views || 0;
      const reactionsReceived = message.reactions?.results?.reduce((s, r) => s + (r.count || 0), 0) || 0;
      const repliesReceived = message.replies?.replies || 0;

      const tier = getAccountTier(chatMemberCount);
      const tierMultiplier = getTierMultiplier(tier);
      const { base, bonus, total } = calculateTelegramPoints({ hasMedia, hasPresaleLink, reactionsReceived, repliesReceived, views, tierMultiplier });

      const trackedTag = TRACKED_TAGS.find(t => lowerText.includes(t)) || "thrft";

      await base44.asServiceRole.entities.SocialActivity.create({
        user_email: profile.user_email,
        platform: "telegram",
        platform_handle: profile.platform_handle,
        action_type: "message",
        tracked_tag: trackedTag,
        content_id: messageId,
        content_text: text.substring(0, 500),
        has_media: hasMedia,
        has_presale_link: hasPresaleLink,
        view_count: views,
        likes_received: reactionsReceived,
        comments_received: repliesReceived,
        base_points: base,
        bonus_points: bonus,
        points_earned: total,
        activity_date: new Date(message.date * 1000).toISOString(),
      });

      existingIds.add(messageId);
      totalCreated++;

      if (!profileUpdates[profile.id]) {
        profileUpdates[profile.id] = { profile, points: 0, post_count: 0 };
      }
      profileUpdates[profile.id].points += total;
      profileUpdates[profile.id].post_count += 1;
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
    console.error("Telegram sync error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});