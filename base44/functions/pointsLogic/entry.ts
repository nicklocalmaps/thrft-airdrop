// ============================================================
// THRFT Unified Point Logic — All Platforms
// NOTE: No local imports allowed. Inline this or copy as needed.
// ============================================================

export function getAccountTier(followers) {
  if (followers >= 250000) return 4;
  if (followers >= 50000) return 3;
  if (followers >= 10000) return 2;
  return 1;
}

export function getTierMultiplier(tier) {
  const multipliers = { 1: 1.0, 2: 1.75, 3: 2.5, 4: 3.5 };
  return multipliers[tier] || 1.0;
}

// Media boost multiplier
export function getMediaMultiplier(media_type) {
  // media_type: 'none' | 'image' | 'short_video' | 'long_video'
  if (media_type === 'long_video') return 2.5;
  if (media_type === 'short_video') return 2.0;
  if (media_type === 'image') return 1.5;
  return 1.0;
}

// Global impression bonus (all platforms)
export function getImpressionBonus(impressions) {
  if (impressions >= 1000000) return 1000;
  if (impressions >= 100000) return 250;
  if (impressions >= 50000) return 100;
  if (impressions >= 10000) return 25;
  if (impressions >= 1000) return 5;
  return 0;
}

// ---- X.com ----
export function calculateXPoints({
  action_type,
  has_media = false,
  has_presale_link = false,
  is_thread = false,
  impression_count = 0,
  replies_received = 0,
  reposts_received = 0,
  bookmarks_received = 0,
  replied_to_followers = 0,
  tier_multiplier = 1,
}) {
  const baseMap = { post: 2, thread: 2, repost: 1.5, quote_repost: 2, reply: 1, bookmark: 1.5 };
  let base = baseMap[action_type] || 0;
  let bonus = 0;

  if (action_type === 'thread' || is_thread) bonus += 3;
  if (has_media) bonus += 2;
  if (has_presale_link) bonus += 2;
  bonus += replies_received * 1;
  bonus += reposts_received * 1.5;
  bonus += bookmarks_received * 1.5;

  // Reply target bonus
  if (action_type === 'reply') {
    if (replied_to_followers >= 100000) bonus += 5;
    else if (replied_to_followers >= 10000) bonus += 2;
  }

  bonus += getImpressionBonus(impression_count);

  const total = (base + bonus) * tier_multiplier;
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

// ---- Telegram ----
export function calculateTelegramPoints({
  action_type, // 'message' | 'invite' | 'active_invite' | 'share_external' | 'viral'
  has_media = false,
  has_presale_link = false,
  reactions_received = 0,
  replies_received = 0,
  view_count = 0,
  tier_multiplier = 1,
}) {
  let base = 0;
  let bonus = 0;

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

  bonus += reactions_received * 0.5;
  bonus += replies_received * 1;
  if (view_count >= 100) bonus += 20; // viral message bonus

  const total = (base + bonus) * tier_multiplier;
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

// ---- Discord ----
export function calculateDiscordPoints({
  action_type, // 'message' | 'thread' | 'invite' | 'active_invite'
  has_media = false,
  reactions_received = 0,
  replies_received = 0,
  is_high_engagement_thread = false, // 25+ replies
  tier_multiplier = 1,
}) {
  let base = 0;
  let bonus = 0;

  if (action_type === 'message') {
    base = has_media ? 2 : 1;
  } else if (action_type === 'thread') {
    base = 3;
  } else if (action_type === 'invite') {
    base = 5;
  } else if (action_type === 'active_invite') {
    base = 10;
  }

  bonus += reactions_received * 0.5;
  bonus += replies_received * 1;
  if (is_high_engagement_thread) bonus += 25;

  const total = (base + bonus) * tier_multiplier;
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

// ---- YouTube ----
export function calculateYouTubePoints({
  action_type, // 'short' | 'video' | 'like' | 'comment' | 'share'
  has_thrft_mention = false,
  has_presale_link = false,
  view_count = 0,
  tier_multiplier = 1,
}) {
  let base = 0;
  let bonus = 0;

  if (action_type === 'short') base = 10;
  else if (action_type === 'video') base = 25;
  else if (action_type === 'like') base = 1;
  else if (action_type === 'comment') base = 2;
  else if (action_type === 'share') base = 3;

  if (action_type === 'short' || action_type === 'video') {
    if (has_thrft_mention) bonus += 10;
    if (has_presale_link) bonus += 15;
  }

  // View bonuses
  if (view_count >= 50000) bonus += 500;
  else if (view_count >= 10000) bonus += 150;
  else if (view_count >= 5000) bonus += 75;
  else if (view_count >= 1000) bonus += 20;

  const total = (base + bonus) * tier_multiplier;
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

// ---- TikTok ----
export function calculateTikTokPoints({
  action_type, // 'video' | 'like' | 'comment' | 'share'
  has_caption_mention = false,
  has_presale_link = false,
  view_count = 0,
  tier_multiplier = 1,
}) {
  let base = 0;
  let bonus = 0;

  if (action_type === 'video') {
    base = 8;
    if (has_caption_mention) bonus += 5;
    if (has_presale_link) bonus += 5;
  } else if (action_type === 'like') base = 1;
  else if (action_type === 'comment') base = 2;
  else if (action_type === 'share') base = 3;

  // View bonuses
  if (view_count >= 1000000) bonus += 2000;
  else if (view_count >= 100000) bonus += 500;
  else if (view_count >= 50000) bonus += 200;
  else if (view_count >= 10000) bonus += 50;
  else if (view_count >= 1000) bonus += 10;

  const total = (base + bonus) * tier_multiplier * 2.0;
  return { base, bonus, total: Math.round(total * 100) / 100 };
}