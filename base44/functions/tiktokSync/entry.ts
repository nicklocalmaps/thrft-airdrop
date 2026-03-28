import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TIKTOK_CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY");
const TIKTOK_CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET");
const TRACKED_HASHTAGS = ["thrft", "thrftapp", "thrftairdrop"];
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
function getTikTokViewBonus(views) {
  if (views >= 1000000) return 2000;
  if (views >= 100000) return 500;
  if (views >= 50000) return 200;
  if (views >= 10000) return 50;
  if (views >= 1000) return 10;
  return 0;
}
function getImpressionBonus(impressions) {
  if (impressions >= 1000000) return 1000;
  if (impressions >= 100000) return 250;
  if (impressions >= 50000) return 100;
  if (impressions >= 10000) return 25;
  if (impressions >= 1000) return 5;
  return 0;
}
function calculateTikTokPoints({ hasMention, hasPresaleLink, viewCount, likeCount, commentCount, shareCount, tierMultiplier }) {
  let base = 8;
  let bonus = 0;
  if (hasMention) bonus += 5;
  if (hasPresaleLink) bonus += 5;
  bonus += (likeCount || 0) * 1;
  bonus += (commentCount || 0) * 2;
  bonus += (shareCount || 0) * 3;
  bonus += getTikTokViewBonus(viewCount || 0);
  bonus += getImpressionBonus(viewCount || 0);
  const total = (base + bonus) * tierMultiplier * 2.0;
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

async function refreshAccessToken(profile) {
  if (!profile.refresh_token) return null;
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: TIKTOK_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: profile.refresh_token,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchUserVideos(accessToken) {
  const res = await fetch(
    "https://open.tiktokapis.com/v2/video/list/?fields=id,create_time,title,video_description,like_count,comment_count,share_count,view_count,cover_image_url",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: 20 }),
    }
  );
  if (!res.ok) throw new Error(`video/list error (${res.status}): ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all connected TikTok profiles with tokens
    const profiles = await base44.asServiceRole.entities.SocialProfile.filter({
      platform: "tiktok",
      is_connected: true,
    });

    const existingActivities = await base44.asServiceRole.entities.SocialActivity.filter({ platform: "tiktok" });
    const existingIds = new Set(existingActivities.map(a => a.content_id).filter(Boolean));

    let totalCreated = 0;
    const profileUpdates = {};

    for (const profile of profiles) {
      if (!profile.access_token) continue;

      let accessToken = profile.access_token;

      // Refresh token if expired or expiring soon
      const expiresAt = profile.token_expires_at ? new Date(profile.token_expires_at) : null;
      const needsRefresh = !expiresAt || expiresAt < new Date(Date.now() + 5 * 60 * 1000);

      if (needsRefresh && profile.refresh_token) {
        const tokenData = await refreshAccessToken(profile).catch(() => null);
        if (tokenData?.access_token) {
          accessToken = tokenData.access_token;
          const newExpiry = new Date(Date.now() + (tokenData.expires_in || 86400) * 1000).toISOString();
          await base44.asServiceRole.entities.SocialProfile.update(profile.id, {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || profile.refresh_token,
            token_expires_at: newExpiry,
          });
        } else {
          console.warn(`Skipping ${profile.platform_handle} — token refresh failed`);
          continue;
        }
      }

      // Fetch this user's videos
      const videoData = await fetchUserVideos(accessToken).catch(e => {
        console.error(`video/list error for ${profile.platform_handle}:`, e.message);
        return null;
      });

      if (!videoData?.data?.videos) continue;

      for (const video of videoData.data.videos) {
        const videoId = String(video.id);
        if (existingIds.has(videoId)) continue;

        const description = (video.title || video.video_description || "").toLowerCase();
        const hasMention = TRACKED_HASHTAGS.some(t => description.includes(t));
        const hasPresaleLink = PRESALE_KEYWORDS.some(k => description.includes(k));

        // Only track videos that mention THRFT
        if (!hasMention && !hasPresaleLink) continue;

        const viewCount = video.view_count || 0;
        const likeCount = video.like_count || 0;
        const commentCount = video.comment_count || 0;
        const shareCount = video.share_count || 0;

        const tier = getAccountTier(profile.followers_count || 0);
        const tierMultiplier = getTierMultiplier(tier);
        const { base, bonus, total } = calculateTikTokPoints({
          hasMention, hasPresaleLink, viewCount, likeCount, commentCount, shareCount, tierMultiplier
        });

        const trackedTag = TRACKED_HASHTAGS.find(t => description.includes(t)) || "thrft";

        await base44.asServiceRole.entities.SocialActivity.create({
          user_email: profile.user_email,
          platform: "tiktok",
          platform_handle: profile.platform_handle,
          action_type: "video",
          tracked_tag: `#${trackedTag}`,
          content_id: videoId,
          content_text: (video.title || video.video_description || "").substring(0, 500),
          has_media: true,
          has_presale_link: hasPresaleLink,
          view_count: viewCount,
          likes_received: likeCount,
          comments_received: commentCount,
          shares_received: shareCount,
          base_points: base,
          bonus_points: bonus,
          points_earned: total,
          activity_date: new Date(video.create_time * 1000).toISOString(),
        });

        existingIds.add(videoId);
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

    return Response.json({
      success: true,
      activities_created: totalCreated,
      profiles_synced: profiles.length,
      profiles_updated: Object.keys(profileUpdates).length,
    });
  } catch (error) {
    console.error("TikTok sync error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});