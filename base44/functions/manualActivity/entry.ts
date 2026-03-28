import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Shared point logic (inlined) ──────────────────────────────────
function getAccountTier(followers) {
  if (followers >= 250000) return 4;
  if (followers >= 50000) return 3;
  if (followers >= 10000) return 2;
  return 1;
}

function getTierMultiplier(tier) {
  return { 1: 1.0, 2: 1.75, 3: 2.5, 4: 3.5 }[tier] || 1.0;
}

function getImpressionBonus(impressions) {
  if (impressions >= 1000000) return 1000;
  if (impressions >= 100000) return 250;
  if (impressions >= 50000) return 100;
  if (impressions >= 10000) return 25;
  if (impressions >= 1000) return 5;
  return 0;
}

function getXReplyTargetBonus(repliedToFollowers) {
  if (repliedToFollowers >= 100000) return 5;
  if (repliedToFollowers >= 10000) return 2;
  return 0;
}

function getYouTubeViewBonus(views) {
  if (views >= 50000) return 500;
  if (views >= 10000) return 150;
  if (views >= 5000) return 75;
  if (views >= 1000) return 20;
  return 0;
}

function getTikTokViewBonus(views) {
  if (views >= 1000000) return 2000;
  if (views >= 100000) return 500;
  if (views >= 50000) return 200;
  if (views >= 10000) return 50;
  if (views >= 1000) return 10;
  return 0;
}

function getTelegramViewBonus(views) {
  if (views >= 100000) return 250;
  if (views >= 50000) return 100;
  if (views >= 10000) return 25;
  if (views >= 1000) return 5;
  return 0;
}

function calculatePoints(platform, params) {
  const { tier_multiplier = 1, velocity_multiplier = 1 } = params;

  if (platform === 'x') {
    const { action_type, has_media, has_presale_link, is_thread, impression_count = 0,
      replies_received = 0, reposts_received = 0, bookmarks_received = 0, replied_to_followers = 0 } = params;
    const basePts = { post: 2, thread: 2, repost: 1.5, quote_repost: 2, reply: 1, bookmark: 1.5 };
    let base = basePts[action_type] || 0;
    let bonus = 0;
    if (action_type === 'thread' || is_thread) bonus += 3;
    if (has_media) bonus += 2;
    if (has_presale_link) bonus += 2;
    bonus += (replies_received || 0) * 1;
    bonus += (reposts_received || 0) * 1.5;
    bonus += (bookmarks_received || 0) * 1.5;
    bonus += getXReplyTargetBonus(replied_to_followers || 0);
    bonus += getImpressionBonus(impression_count || 0);
    const total = (base + bonus) * tier_multiplier * velocity_multiplier;
    return { base, bonus, total: Math.round(total * 100) / 100 };
  }

  if (platform === 'telegram') {
    const { has_media, has_presale_link, reactions_received = 0, replies_received = 0, view_count = 0 } = params;
    let base = has_presale_link ? 3 : has_media ? 2 : 1;
    let bonus = 0;
    bonus += (reactions_received || 0) * 0.5;
    bonus += (replies_received || 0) * 1;
    bonus += getTelegramViewBonus(view_count || 0);
    if ((view_count || 0) >= 100 || (reactions_received || 0) >= 100) bonus += 20;
    const mediaMultiplier = has_media ? 1.5 : 1.0;
    const total = (base + bonus) * tier_multiplier * velocity_multiplier * mediaMultiplier;
    return { base, bonus, total: Math.round(total * 100) / 100 };
  }

  if (platform === 'discord') {
    const { has_media, is_thread, reactions_received = 0, replies_received = 0 } = params;
    let base = is_thread ? 3 : has_media ? 2 : 1;
    let bonus = 0;
    bonus += (reactions_received || 0) * 0.5;
    bonus += (replies_received || 0) * 1;
    if (is_thread && (replies_received || 0) >= 25) bonus += 25;
    const mediaMultiplier = (has_media && !is_thread) ? 1.5 : 1.0;
    const total = (base + bonus) * tier_multiplier * velocity_multiplier * mediaMultiplier;
    return { base, bonus, total: Math.round(total * 100) / 100 };
  }

  if (platform === 'youtube') {
    const { is_short, has_mention, has_presale_link, view_count = 0,
      like_count = 0, comment_count = 0, share_count = 0 } = params;
    let base = is_short ? 10 : 25;
    let bonus = 0;
    if (has_mention) bonus += 10;
    if (has_presale_link) bonus += 15;
    bonus += (like_count || 0) * 1;
    bonus += (comment_count || 0) * 2;
    bonus += (share_count || 0) * 3;
    bonus += getYouTubeViewBonus(view_count || 0);
    bonus += getImpressionBonus(view_count || 0);
    const mediaMultiplier = is_short ? 2.0 : 2.5;
    const total = (base + bonus) * tier_multiplier * velocity_multiplier * mediaMultiplier;
    return { base, bonus, total: Math.round(total * 100) / 100 };
  }

  if (platform === 'tiktok') {
    const { has_mention, has_presale_link, view_count = 0,
      like_count = 0, comment_count = 0, share_count = 0 } = params;
    let base = 8;
    let bonus = 0;
    if (has_mention) bonus += 5;
    if (has_presale_link) bonus += 5;
    bonus += (like_count || 0) * 1;
    bonus += (comment_count || 0) * 2;
    bonus += (share_count || 0) * 3;
    bonus += getTikTokViewBonus(view_count || 0);
    bonus += getImpressionBonus(view_count || 0);
    const total = (base + bonus) * tier_multiplier * velocity_multiplier * 2.0;
    return { base, bonus, total: Math.round(total * 100) / 100 };
  }

  return { base: 0, bonus: 0, total: 0 };
}

// ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      // Platform selection
      platform = 'x',

      // X fields
      x_handle,
      action_type,
      tracked_tag,
      tweet_id,
      conversation_id,
      tweet_text,
      replied_to_handle,
      replied_to_followers = 0,
      replies_received = 0,
      reposts_received = 0,
      bookmarks_received = 0,
      impression_count = 0,

      // Common fields
      platform_handle,
      content_id,
      content_text,
      activity_date,
      has_media = false,
      has_presale_link = false,

      // Telegram / Discord fields
      is_thread = false,
      reactions_received = 0,
      view_count = 0,

      // YouTube fields
      is_short = false,
      has_mention = false,
      like_count = 0,
      comment_count = 0,
      share_count = 0,

      // TikTok (same as YouTube engagement)
    } = body;

    // ── X platform (uses XProfile) ─────────────────────────────────
    if (platform === 'x') {
      if (!x_handle || !action_type || !tracked_tag) {
        return Response.json({ error: 'x_handle, action_type, and tracked_tag are required for X' }, { status: 400 });
      }

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

      const { base, bonus, total } = calculatePoints('x', {
        action_type, has_media, has_presale_link, is_thread: action_type === 'thread',
        impression_count, replies_received, reposts_received, bookmarks_received,
        replied_to_followers, tier_multiplier: tierMultiplier * velocityMultiplier,
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
          body: `Hi @${profile.x_handle},\n\nAn admin awarded you ${total} points for a ${action_type} on ${tracked_tag}.\n\nBase: ${base} pts | Bonus: ${bonus} pts | Multiplier: ${tierMultiplier * velocityMultiplier}x\n\nYour total is now ${(profile.total_points || 0) + total} points.\n\n— The THRFT Team`,
        });
      }

      return Response.json({ success: true, activity, points_earned: total, base_points: base, bonus_points: bonus });
    }

    // ── Other platforms (use SocialProfile + SocialActivity) ───────
    if (!platform_handle || !tracked_tag) {
      return Response.json({ error: 'platform_handle and tracked_tag are required' }, { status: 400 });
    }

    const cleanHandle = platform_handle.replace('@', '').toLowerCase();
    const socialProfiles = await base44.asServiceRole.entities.SocialProfile.filter({
      platform,
      platform_handle: cleanHandle,
    });
    const profile = socialProfiles[0] || null;

    const followers = profile?.followers_count || 0;
    const tier = getAccountTier(followers);
    const tierMultiplier = getTierMultiplier(tier);

    const { base, bonus, total } = calculatePoints(platform, {
      has_media, has_presale_link, is_thread,
      reactions_received, view_count, replies_received,
      is_short, has_mention,
      like_count, comment_count, share_count,
      tier_multiplier: tierMultiplier,
    });

    const activity = await base44.asServiceRole.entities.SocialActivity.create({
      user_email: profile?.user_email || null,
      platform,
      platform_handle: cleanHandle,
      action_type: action_type || "post",
      tracked_tag,
      content_id: content_id || null,
      content_text: content_text || null,
      has_media,
      has_presale_link,
      view_count,
      likes_received: reactions_received || like_count,
      comments_received: comment_count,
      shares_received: share_count,
      base_points: base,
      bonus_points: bonus,
      points_earned: total,
      activity_date: activity_date || new Date().toISOString(),
    });

    if (profile) {
      await base44.asServiceRole.entities.SocialProfile.update(profile.id, {
        total_points: (profile.total_points || 0) + total,
        account_tier: tier,
        multiplier: tierMultiplier,
        post_count: (profile.post_count || 0) + 1,
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: profile.user_email,
        subject: `You earned ${total} points on THRFT Airdrop! 🎉`,
        body: `Hi ${cleanHandle},\n\nAn admin awarded you ${total} points for activity on ${platform} (${tracked_tag}).\n\nBase: ${base} pts | Bonus: ${bonus} pts | Multiplier: ${tierMultiplier}x\n\nYour total is now ${(profile.total_points || 0) + total} points.\n\n— The THRFT Team`,
      });
    }

    return Response.json({ success: true, activity, points_earned: total, base_points: base, bonus_points: bonus });

  } catch (error) {
    console.error("Manual activity error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});