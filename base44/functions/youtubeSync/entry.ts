import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
const TRACKED_TAGS = ["THRFT", "THRFTapp", "THRFTairdrop"];
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
function getYouTubeViewBonus(views) {
  if (views >= 50000) return 500;
  if (views >= 10000) return 150;
  if (views >= 5000) return 75;
  if (views >= 1000) return 20;
  return 0;
}

function calculateYouTubePoints({ isShort, hasMention, hasPresaleLink, viewCount, likeCount, commentCount, shareCount, tierMultiplier }) {
  let base = isShort ? 10 : 25;
  let bonus = 0;
  if (hasMention) bonus += 10;
  if (hasPresaleLink) bonus += 15;
  bonus += (likeCount || 0) * 1;
  bonus += (commentCount || 0) * 2;
  bonus += (shareCount || 0) * 3;
  bonus += getYouTubeViewBonus(viewCount || 0);
  bonus += getImpressionBonus(viewCount || 0);
  const mediaMultiplier = isShort ? 2.0 : 2.5;
  const total = (base + bonus) * tierMultiplier * mediaMultiplier;
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

async function ytFetch(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  Object.entries({ ...params, key: YOUTUBE_API_KEY }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube API error (${res.status}): ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (!YOUTUBE_API_KEY) {
      return Response.json({ error: 'YOUTUBE_API_KEY secret required' }, { status: 400 });
    }

    const socialProfiles = await base44.asServiceRole.entities.SocialProfile.filter({ platform: "youtube" });
    const profilesByHandle = {};
    socialProfiles.forEach(p => {
      if (p.platform_handle) profilesByHandle[p.platform_handle.toLowerCase().replace(/[@\s]/g, "")] = p;
      if (p.platform_user_id) profilesByHandle[p.platform_user_id] = p;
    });

    const existingActivities = await base44.asServiceRole.entities.SocialActivity.filter({ platform: "youtube" });
    const existingIds = new Set(existingActivities.map(a => a.content_id).filter(Boolean));

    let totalCreated = 0;
    const profileUpdates = {};

    for (const tag of TRACKED_TAGS) {
      const searchData = await ytFetch("search", {
        part: "snippet",
        q: `#${tag}`,
        type: "video",
        maxResults: "50",
        order: "date",
        publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      }).catch(e => { console.error(`YouTube search error for ${tag}:`, e.message); return null; });

      if (!searchData?.items?.length) continue;

      const videoIds = searchData.items.map(i => i.id.videoId).filter(Boolean);
      const channelIds = [...new Set(searchData.items.map(i => i.snippet.channelId))];

      const [videoDetails, channelDetails] = await Promise.all([
        ytFetch("videos", { part: "statistics,contentDetails", id: videoIds.join(",") }).catch(() => null),
        ytFetch("channels", { part: "statistics", id: channelIds.join(",") }).catch(() => null),
      ]);

      const channelSubMap = {};
      channelDetails?.items?.forEach(c => {
        channelSubMap[c.id] = parseInt(c.statistics.subscriberCount || 0);
      });
      const videoMap = {};
      videoDetails?.items?.forEach(v => { videoMap[v.id] = v; });

      for (const item of searchData.items) {
        const videoId = item.id.videoId;
        if (!videoId || existingIds.has(videoId)) continue;

        const channelId = item.snippet.channelId;
        const channelTitle = item.snippet.channelTitle?.toLowerCase().replace(/\s+/g, "");
        const profile = profilesByHandle[channelTitle] || profilesByHandle[channelId] ||
          socialProfiles.find(p => p.platform_user_id === channelId);
        if (!profile) continue;

        const video = videoMap[videoId];
        const stats = video?.statistics || {};
        const duration = video?.contentDetails?.duration || "";
        const fullText = `${item.snippet.title} ${item.snippet.description}`.toLowerCase();

        const viewCount = parseInt(stats.viewCount || 0);
        const likeCount = parseInt(stats.likeCount || 0);
        const commentCount = parseInt(stats.commentCount || 0);
        const isShort = /^PT(\d+)S$/.test(duration) && parseInt(duration.match(/\d+/)?.[0] || 999) <= 60;
        const hasMention = TRACKED_TAGS.some(t => fullText.includes(t.toLowerCase()));
        const hasPresaleLink = PRESALE_KEYWORDS.some(k => fullText.includes(k));

        const subscribers = channelSubMap[channelId] || profile.followers_count || 0;
        const tier = getAccountTier(subscribers);
        const tierMultiplier = getTierMultiplier(tier);

        const { base, bonus, total } = calculateYouTubePoints({
          isShort, hasMention, hasPresaleLink, viewCount, likeCount, commentCount, shareCount: 0, tierMultiplier
        });

        await base44.asServiceRole.entities.SocialActivity.create({
          user_email: profile.user_email,
          platform: "youtube",
          platform_handle: profile.platform_handle,
          action_type: "video",
          tracked_tag: `#${tag}`,
          content_id: videoId,
          content_text: item.snippet.title,
          has_media: true,
          has_presale_link: hasPresaleLink,
          view_count: viewCount,
          likes_received: likeCount,
          comments_received: commentCount,
          base_points: base,
          bonus_points: bonus,
          points_earned: total,
          activity_date: item.snippet.publishedAt,
        });

        existingIds.add(videoId);
        totalCreated++;

        if (!profileUpdates[profile.id]) {
          profileUpdates[profile.id] = { profile, points: 0, post_count: 0, subscribers, tier, tierMultiplier };
        }
        profileUpdates[profile.id].points += total;
        profileUpdates[profile.id].post_count += 1;
      }
    }

    for (const [profileId, upd] of Object.entries(profileUpdates)) {
      await base44.asServiceRole.entities.SocialProfile.update(profileId, {
        total_points: (upd.profile.total_points || 0) + upd.points,
        post_count: (upd.profile.post_count || 0) + upd.post_count,
        followers_count: upd.subscribers,
        account_tier: upd.tier,
        multiplier: upd.tierMultiplier,
        is_connected: true,
      });
    }

    return Response.json({ success: true, activities_created: totalCreated, profiles_updated: Object.keys(profileUpdates).length });
  } catch (error) {
    console.error("YouTube sync error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});