import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function getAccountTier(followers) {
  if (followers >= 250000) return 4;
  if (followers >= 50000) return 3;
  if (followers >= 10000) return 2;
  return 1;
}

function getTierMultiplier(tier) {
  const multipliers = { 1: 1.0, 2: 1.75, 3: 2.5, 4: 3.5 };
  return multipliers[tier] || 1.0;
}

function getImpressionBonus(impressions) {
  if (impressions >= 50000) return 100;
  if (impressions >= 10000) return 30;
  if (impressions >= 5000) return 15;
  if (impressions >= 1000) return 5;
  return 0;
}

function getReplyTargetBonus(repliedToFollowers) {
  if (repliedToFollowers >= 100000) return 5;
  if (repliedToFollowers >= 10000) return 2;
  return 0;
}

function calculateBasePoints(action_type) {
  const pts = { post: 2, thread: 2, repost: 1.5, quote_repost: 2, reply: 1, bookmark: 1.5 };
  return pts[action_type] || 0;
}

function calculateActivityPoints({ action_type, has_media, has_presale_link, impression_count, replies_received, reposts_received, bookmarks_received, replied_to_followers, tier_multiplier }) {
  let base = calculateBasePoints(action_type);
  let bonus = 0;
  if (action_type === 'thread') bonus += 3;
  if (has_media) bonus += 2;
  if (has_presale_link) bonus += 2;
  bonus += (replies_received || 0) * 1;
  bonus += (reposts_received || 0) * 1.5;
  bonus += (bookmarks_received || 0) * 1.5;
  bonus += getReplyTargetBonus(replied_to_followers || 0);
  bonus += getImpressionBonus(impression_count || 0);
  const total = (base + bonus) * (tier_multiplier || 1);
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      x_handle, action_type, tracked_tag, tweet_id, conversation_id,
      tweet_text, activity_date,
      has_media = false, has_presale_link = false,
      impression_count = 0,
      replies_received = 0, reposts_received = 0, bookmarks_received = 0,
      replied_to_handle = null, replied_to_followers = 0,
    } = body;

    if (!x_handle || !action_type || !tracked_tag) {
      return Response.json({ error: 'x_handle, action_type, and tracked_tag are required' }, { status: 400 });
    }

    // Check for duplicate tweet_id
    if (tweet_id) {
      const existing = await base44.asServiceRole.entities.Activity.filter({ tweet_id });
      if (existing.length > 0) {
        return Response.json({ error: 'Activity with this tweet ID already exists' }, { status: 409 });
      }
    }

    const cleanHandle = x_handle.replace('@', '').toLowerCase();
    const profiles = await base44.asServiceRole.entities.XProfile.filter({ x_handle: cleanHandle });
    const profile = profiles[0] || null;

    const followers = profile?.followers_count || 0;
    const tier = getAccountTier(followers);
    const tierMultiplier = getTierMultiplier(tier);
    const velocityMultiplier = profile?.velocity_multiplier || 1;
    const finalMultiplier = tierMultiplier * velocityMultiplier;

    const { base, bonus, total } = calculateActivityPoints({
      action_type, has_media, has_presale_link, impression_count,
      replies_received, reposts_received, bookmarks_received,
      replied_to_followers, tier_multiplier: finalMultiplier,
    });

    const activity = await base44.asServiceRole.entities.Activity.create({
      x_handle: cleanHandle,
      user_email: profile?.user_email || null,
      action_type,
      tracked_tag,
      tweet_id: tweet_id || null,
      conversation_id: conversation_id || null,
      tweet_text: tweet_text || null,
      has_media,
      has_presale_link,
      impression_count,
      replies_received,
      reposts_received,
      bookmarks_received,
      replied_to_handle,
      replied_to_followers,
      base_points: base,
      bonus_points: bonus,
      points_earned: total,
      activity_date: activity_date || new Date().toISOString(),
    });

    if (profile) {
      const countField = `${action_type}_count`;
      await base44.asServiceRole.entities.XProfile.update(profile.id, {
        total_points: (profile.total_points || 0) + total,
        account_tier: tier,
        multiplier: tierMultiplier,
        [countField]: (profile[countField] || 0) + 1,
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: profile.user_email,
        subject: `You earned ${total} points on THRFT Airdrop! 🎉`,
        body: `Hi @${profile.x_handle},\n\nAn admin awarded you ${total} points for a ${action_type} on ${tracked_tag}.\n\nBase: ${base} pts | Bonus: ${bonus} pts | Multiplier: ${finalMultiplier}x\n\nYour total is now ${(profile.total_points || 0) + total} points.\n\n— The THRFT Team`,
      });
    }

    return Response.json({ success: true, activity, points_earned: total, base_points: base, bonus_points: bonus });
  } catch (error) {
    console.error("Manual activity error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});