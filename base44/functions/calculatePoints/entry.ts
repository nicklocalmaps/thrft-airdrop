// ─────────────────────────────────────────────────────────────────
// THRFT Unified Point Calculation Logic
// Inline this into any function that needs it (no local imports in Deno)
// ─────────────────────────────────────────────────────────────────

// ── Account Tier ──────────────────────────────────────────────────
export function getAccountTier(followers) {
  if (followers >= 250000) return 4;
  if (followers >= 50000) return 3;
  if (followers >= 10000) return 2;
  return 1;
}

export function getTierMultiplier(tier) {
  return { 1: 1.0, 2: 1.75, 3: 2.5, 4: 3.5 }[tier] || 1.0;
}

// ── Media Multiplier ──────────────────────────────────────────────
// text-only=1.0, image/GIF=1.5, short video=2.0, long video=2.5
export function getMediaMultiplier(mediaType) {
  if (mediaType === "long_video") return 2.5;
  if (mediaType === "short_video") return 2.0;
  if (mediaType === "image") return 1.5;
  return 1.0;
}

// ── Velocity Multiplier ───────────────────────────────────────────
export function getVelocityMultiplier(actionsPerHour) {
  if (actionsPerHour >= 50) return 2.0;
  if (actionsPerHour >= 25) return 1.5;
  if (actionsPerHour >= 10) return 1.2;
  return 1.0;
}

// ── Global Impression Bonus (all platforms) ───────────────────────
export function getImpressionBonus(impressions) {
  if (impressions >= 1000000) return 1000;
  if (impressions >= 100000) return 250;
  if (impressions >= 50000) return 100;
  if (impressions >= 10000) return 25;
  if (impressions >= 1000) return 5;
  return 0;
}

// ── X.com ─────────────────────────────────────────────────────────
export function getXReplyTargetBonus(repliedToFollowers) {
  if (repliedToFollowers >= 100000) return 5;
  if (repliedToFollowers >= 10000) return 2;
  return 0;
}

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
  velocity_multiplier = 1,
}) {
  const basePts = { post: 2, thread: 2, repost: 1.5, quote_repost: 2, reply: 1, bookmark: 1.5 };
  let base = basePts[action_type] || 0;
  let bonus = 0;

  if (action_type === 'thread' || is_thread) bonus += 3;
  if (has_media) bonus += 2;
  if (has_presale_link) bonus += 2;
  bonus += replies_received * 1;
  bonus += reposts_received * 1.5;
  bonus += bookmarks_received * 1.5;
  bonus += getXReplyTargetBonus(replied_to_followers);
  bonus += getImpressionBonus(impression_count);

  const total = (base + bonus) * tier_multiplier * velocity_multiplier;
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

// ── Telegram ──────────────────────────────────────────────────────
export function calculateTelegramPoints({
  has_media = false,
  has_presale_link = false,
  reactions_received = 0,
  replies_received = 0,
  view_count = 0,
  tier_multiplier = 1,
  velocity_multiplier = 1,
}) {
  let base = has_media ? 2 : 1;
  if (has_presale_link) base = 3;
  let bonus = 0;

  bonus += reactions_received * 0.5;
  bonus += replies_received * 1;
  bonus += getImpressionBonus(view_count);

  // Viral bonus
  if (view_count >= 100 || reactions_received >= 100) bonus += 20;

  const mediaMultiplier = has_media ? 1.5 : 1.0;
  const total = (base + bonus) * tier_multiplier * velocity_multiplier * mediaMultiplier;
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

// ── Discord ───────────────────────────────────────────────────────
export function calculateDiscordPoints({
  has_media = false,
  is_thread = false,
  reactions_received = 0,
  replies_received = 0,
  tier_multiplier = 1,
  velocity_multiplier = 1,
}) {
  let base = is_thread ? 3 : has_media ? 2 : 1;
  let bonus = 0;

  bonus += reactions_received * 0.5;
  bonus += replies_received * 1;
  if (is_thread && replies_received >= 25) bonus += 25;

  const mediaMultiplier = (has_media && !is_thread) ? 1.5 : 1.0;
  const total = (base + bonus) * tier_multiplier * velocity_multiplier * mediaMultiplier;
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

// ── YouTube ───────────────────────────────────────────────────────
export function getYouTubeViewBonus(views) {
  if (views >= 50000) return 500;
  if (views >= 10000) return 150;
  if (views >= 5000) return 75;
  if (views >= 1000) return 20;
  return 0;
}

export function calculateYouTubePoints({
  is_short = false,
  has_mention = false,
  has_presale_link = false,
  view_count = 0,
  like_count = 0,
  comment_count = 0,
  share_count = 0,
  tier_multiplier = 1,
  velocity_multiplier = 1,
}) {
  let base = is_short ? 10 : 25;
  let bonus = 0;

  if (has_mention) bonus += 10;
  if (has_presale_link) bonus += 15;
  bonus += like_count * 1;
  bonus += comment_count * 2;
  bonus += share_count * 3;
  bonus += getYouTubeViewBonus(view_count);
  bonus += getImpressionBonus(view_count);

  const mediaMultiplier = is_short ? 2.0 : 2.5;
  const total = (base + bonus) * tier_multiplier * velocity_multiplier * mediaMultiplier;
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

// ── TikTok ────────────────────────────────────────────────────────
export function getTikTokViewBonus(views) {
  if (views >= 1000000) return 2000;
  if (views >= 100000) return 500;
  if (views >= 50000) return 200;
  if (views >= 10000) return 50;
  if (views >= 1000) return 10;
  return 0;
}

export function calculateTikTokPoints({
  has_mention = false,
  has_presale_link = false,
  view_count = 0,
  like_count = 0,
  comment_count = 0,
  share_count = 0,
  tier_multiplier = 1,
  velocity_multiplier = 1,
}) {
  let base = 8;
  let bonus = 0;

  if (has_mention) bonus += 5;
  if (has_presale_link) bonus += 5;
  bonus += like_count * 1;
  bonus += comment_count * 2;
  bonus += share_count * 3;
  bonus += getTikTokViewBonus(view_count);
  bonus += getImpressionBonus(view_count);

  const mediaMultiplier = 2.0; // all TikTok = short-form video
  const total = (base + bonus) * tier_multiplier * velocity_multiplier * mediaMultiplier;
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

// ── Cross-Platform Synergy Bonus ──────────────────────────────────
export function getCrossPlatformBonus(platformCount) {
  if (platformCount >= 5) return 25;
  if (platformCount >= 3) return 10;
  return 0;
}

// ── Referral / Capital Bonuses ────────────────────────────────────
export function getCapitalBonus(usdAmount) {
  if (usdAmount >= 10000) return 5000;
  if (usdAmount >= 1000) return 300;
  if (usdAmount >= 100) return 25;
  return 0;
}