// Shared point calculation logic for THRFT Airdrop campaign
// This module is inlined into functions that need it (no local imports allowed)

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

export function getImpressionBonus(impressions) {
  if (impressions >= 50000) return 100;
  if (impressions >= 10000) return 30;
  if (impressions >= 5000) return 15;
  if (impressions >= 1000) return 5;
  return 0;
}

export function getReplyTargetBonus(repliedToFollowers) {
  if (repliedToFollowers >= 100000) return 5;
  if (repliedToFollowers >= 10000) return 2;
  return 0;
}

export function calculateBasePoints(action_type) {
  const pts = {
    post: 2,
    thread: 2,        // base same as post, +3 bonus applied separately
    repost: 1.5,
    quote_repost: 2,
    reply: 1,
    bookmark: 1.5,
  };
  return pts[action_type] || 0;
}

export function calculateActivityPoints({
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
  let base = calculateBasePoints(action_type);
  let bonus = 0;

  // Thread bonus
  if (action_type === 'thread' || is_thread) bonus += 3;
  // Media bonus
  if (has_media) bonus += 2;
  // Presale link bonus
  if (has_presale_link) bonus += 2;
  // Engagement received bonuses
  bonus += replies_received * 1;
  bonus += reposts_received * 1.5;
  bonus += bookmarks_received * 1.5;
  // Reply target bonus
  bonus += getReplyTargetBonus(replied_to_followers);
  // Impression bonus
  bonus += getImpressionBonus(impression_count);

  const total = (base + bonus) * tier_multiplier;
  return { base, bonus, total: Math.round(total * 100) / 100 };
}