import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const GROUP_ID = Deno.env.get("TELEGRAM_GROUP_ID");
const TRACKED_TAGS = ["THRFT", "THRFTapp", "THRFTairdrop", "thrft.app"];
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

function calculateTelegramPoints({ action_type, has_media, has_presale_link, reactions_received, replies_received, view_count, tier_multiplier }) {
  let base = 0, bonus = 0;

  if (action_type === 'message') {
    base = has_media ? 2 : 1;
    if (has_presale_link) base = Math.max(base, 3);
  } else if (action_type === 'invite') {
    base = 5;
  } else if (action_type === 'active_invite') {
    base = 10;
  } else if (action_type === 'share_external') {
    base = 3;
  }

  bonus += (reactions_received || 0) * 0.5;
  bonus += (replies_received || 0) * 1;
  if ((view_count || 0) >= 100) bonus += 20; // viral message bonus

  const total = (base + bonus) * (tier_multiplier || 1);
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

async function telegramApi(method, params = {}) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Telegram API error (${method}): ${res.status} ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    if (!BOT_TOKEN || !GROUP_ID) {
      return Response.json({ error: 'TELEGRAM_BOT_TOKEN and TELEGRAM_GROUP_ID secrets are required.' }, { status: 400 });
    }

    // Load registered Telegram profiles
    const socialProfiles = await base44.asServiceRole.entities.SocialProfile.filter({ platform: 'telegram' });
    if (socialProfiles.length === 0) return Response.json({ message: 'No Telegram profiles registered.' });

    const profilesByHandle = {};
    socialProfiles.forEach(p => {
      const key = p.platform_handle?.replace('@', '').toLowerCase();
      if (key) profilesByHandle[key] = p;
    });

    // Get recent messages from the group (last 100)
    const updatesData = await telegramApi('getUpdates', { limit: 100, offset: -100 });
    const updates = updatesData.result || [];

    const existing = await base44.asServiceRole.entities.SocialActivity.filter({ platform: 'telegram' });
    const existingIds = new Set(existing.map(a => a.content_id).filter(Boolean));

    let totalCreated = 0;

    for (const update of updates) {
      const msg = update.message || update.channel_post;
      if (!msg) continue;

      const chatId = String(msg.chat?.id || '');
      if (chatId !== String(GROUP_ID) && chatId !== GROUP_ID) continue;

      const msgId = String(msg.message_id);
      if (existingIds.has(msgId)) continue;

      const text = msg.text || msg.caption || '';
      const hasThrftTag = TRACKED_TAGS.some(t => text.toLowerCase().includes(t.toLowerCase()));
      if (!hasThrftTag) continue;

      const username = msg.from?.username?.toLowerCase();
      if (!username) continue;

      const profile = profilesByHandle[username];
      if (!profile) continue;

      const has_media = !!(msg.photo || msg.video || msg.animation || msg.document);
      const has_presale_link = PRESALE_KEYWORDS.some(k => text.toLowerCase().includes(k));
      const reactions_received = msg.reactions?.reduce((sum, r) => sum + (r.count || 0), 0) || 0;
      const view_count = msg.views || 0;

      // Get XProfile for tier
      const xProfiles = await base44.asServiceRole.entities.XProfile.filter({ user_email: profile.user_email });
      const followers = xProfiles[0]?.followers_count || profile.followers_count || 0;
      const tier = getAccountTier(followers);
      const tier_multiplier = getTierMultiplier(tier);

      const { base, bonus, total } = calculateTelegramPoints({
        action_type: 'message',
        has_media,
        has_presale_link,
        reactions_received,
        replies_received: msg.reply_to_message ? 0 : 0,
        view_count,
        tier_multiplier,
      });

      await base44.asServiceRole.entities.SocialActivity.create({
        user_email: profile.user_email,
        platform: 'telegram',
        platform_handle: profile.platform_handle,
        action_type: 'message',
        tracked_tag: TRACKED_TAGS.find(t => text.toLowerCase().includes(t.toLowerCase())) || '#THRFT',
        content_id: msgId,
        content_text: text.substring(0, 500),
        has_media,
        has_presale_link,
        view_count,
        likes_received: reactions_received,
        base_points: base,
        bonus_points: bonus,
        points_earned: total,
        activity_date: new Date(msg.date * 1000).toISOString(),
      });

      await base44.asServiceRole.entities.SocialProfile.update(profile.id, {
        total_points: (profile.total_points || 0) + total,
        post_count: (profile.post_count || 0) + 1,
        account_tier: tier,
        multiplier: tier_multiplier,
      });

      existingIds.add(msgId);
      totalCreated++;
    }

    return Response.json({ success: true, platform: 'telegram', activities_created: totalCreated });
  } catch (error) {
    console.error('Telegram sync error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});