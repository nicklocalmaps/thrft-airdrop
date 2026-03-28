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
function getImpressionBonus(impressions) {
  if (impressions >= 1000000) return 1000;
  if (impressions >= 100000) return 250;
  if (impressions >= 50000) return 100;
  if (impressions >= 10000) return 25;
  if (impressions >= 1000) return 5;
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
  const total = (base + bonus) * tierMultiplier * 2.0; // 2.0x short-form video multiplier
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

async function getTikTokAccessToken() {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: TIKTOK_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`TikTok auth error: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function searchTikTokVideos(accessToken, hashtag) {
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const endDate = new Date();
  const fmt = d => d.toISOString().split("T")[0].replace(/-/g, "");

  const res = await fetch("https://open.tiktokapis.com/v2/research/video/query/", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: { and: [{ operation: "IN", field_name: "hashtag_name", field_values: [hashtag] }] },
      start_date: fmt(startDate),
      end_date: fmt(endDate),
      max_count: 100,
      fields: "id,create_time,username,video_description,like_count,comment_count,share_count,view_count",
    }),
  });
  if (!res.ok) throw new Error(`TikTok search error: ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
      return Response.json({ error: 'TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET secrets required. TikTok Research API requires application approval at developers.tiktok.com' }, { status: 400 });
    }

    let accessToken;
    try {
      accessToken = await getTikTokAccessToken();
    } catch (e) {
      return Response.json({ error: `TikTok auth failed: ${e.message}` }, { status: 401 });
    }

    const socialProfiles = await base44.asServiceRole.entities.SocialProfile.filter({ platform: "tiktok" });
    const profilesByHandle = {};
    socialProfiles.forEach(p => {
      if (p.platform_handle) profilesByHandle[p.platform_handle.toLowerCase().replace("@", "")] = p;
    });

    const existingActivities = await base44.asServiceRole.entities.SocialActivity.filter({ platform: "tiktok" });
    const existingIds = new Set(existingActivities.map(a => a.content_id).filter(Boolean));

    let totalCreated = 0;
    const profileUpdates = {};

    for (const hashtag of TRACKED_HASHTAGS) {
      const searchData = await searchTikTokVideos(accessToken, hashtag).catch(e => {
        console.error(`TikTok search error for ${hashtag}:`, e.message);
        return null;
      });

      for (const video of (searchData?.data?.videos || [])) {
        const videoId = String(video.id);
        if (existingIds.has(videoId)) continue;

        const username = video.username?.toLowerCase();
        if (!username) continue;

        const profile = profilesByHandle[username];
        if (!profile) continue;

        const description = video.video_description || "";
        const lowerDesc = description.toLowerCase();
        const hasMention = TRACKED_HASHTAGS.some(t => lowerDesc.includes(t));
        const hasPresaleLink = PRESALE_KEYWORDS.some(k => lowerDesc.includes(k));

        const viewCount = video.view_count || 0;
        const likeCount = video.like_count || 0;
        const commentCount = video.comment_count || 0;
        const shareCount = video.share_count || 0;

        const tier = getAccountTier(profile.followers_count || 0);
        const tierMultiplier = getTierMultiplier(tier);
        const { base, bonus, total } = calculateTikTokPoints({ hasMention, hasPresaleLink, viewCount, likeCount, commentCount, shareCount, tierMultiplier });

        await base44.asServiceRole.entities.SocialActivity.create({
          user_email: profile.user_email,
          platform: "tiktok",
          platform_handle: profile.platform_handle,
          action_type: "video",
          tracked_tag: `#${hashtag}`,
          content_id: videoId,
          content_text: description.substring(0, 500),
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

    return Response.json({ success: true, activities_created: totalCreated, profiles_updated: Object.keys(profileUpdates).length });
  } catch (error) {
    console.error("TikTok sync error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});