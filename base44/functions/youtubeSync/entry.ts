import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
const TRACKED_TAGS = ["THRFT", "THRFTapp", "THRFTairdrop"];

function getAccountTier(followers) {
  if (followers >= 250000) return 4;
  if (followers >= 50000) return 3;
  if (followers >= 10000) return 2;
  return 1;
}
function getTierMultiplier(tier) {
  return { 1: 1.0, 2: 1.75, 3: 2.5, 4: 3.5 }[tier] || 1.0;
}

function calculateYouTubePoints({ action_type, has_thrft_mention, has_presale_link, view_count, tier_multiplier }) {
  let base = 0, bonus = 0;
  if (action_type === 'short') base = 10;
  else if (action_type === 'video') base = 25;
  else if (action_type === 'like') base = 1;
  else if (action_type === 'comment') base = 2;
  else if (action_type === 'share') base = 3;

  if (action_type === 'short' || action_type === 'video') {
    if (has_thrft_mention) bonus += 10;
    if (has_presale_link) bonus += 15;
  }

  if (view_count >= 50000) bonus += 500;
  else if (view_count >= 10000) bonus += 150;
  else if (view_count >= 5000) bonus += 75;
  else if (view_count >= 1000) bonus += 20;

  const total = (base + bonus) * (tier_multiplier || 1);
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

async function searchYouTubeVideos(query) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=50&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube search error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getVideoStats(videoIds) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube stats error: ${res.status}`);
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    // Load registered YouTube profiles
    const socialProfiles = await base44.asServiceRole.entities.SocialProfile.filter({ platform: 'youtube' });
    if (socialProfiles.length === 0) return Response.json({ message: 'No YouTube profiles registered.' });

    // Build handle->profile map (channel handle or display name)
    const profilesByHandle = {};
    socialProfiles.forEach(p => {
      const key = p.platform_handle?.replace('@', '').toLowerCase();
      if (key) profilesByHandle[key] = p;
    });

    // Get existing activity IDs to avoid duplicates
    const existing = await base44.asServiceRole.entities.SocialActivity.filter({ platform: 'youtube' });
    const existingIds = new Set(existing.map(a => a.content_id).filter(Boolean));

    let totalCreated = 0;

    for (const tag of TRACKED_TAGS) {
      const searchData = await searchYouTubeVideos(`#${tag}`).catch(e => { console.error(e.message); return null; });
      if (!searchData?.items?.length) continue;

      const videoIds = searchData.items.map(i => i.id.videoId).filter(Boolean);
      if (!videoIds.length) continue;

      const statsData = await getVideoStats(videoIds).catch(e => { console.error(e.message); return null; });
      if (!statsData?.items) continue;

      for (const video of statsData.items) {
        if (existingIds.has(video.id)) continue;

        const channelTitle = video.snippet?.channelTitle?.toLowerCase().replace(/\s+/g, '');
        const channelHandle = video.snippet?.channelHandle?.replace('@', '').toLowerCase();

        // Match against registered profiles
        const profile = profilesByHandle[channelHandle] || profilesByHandle[channelTitle];
        if (!profile) continue;

        const viewCount = parseInt(video.statistics?.viewCount || '0');
        const duration = video.contentDetails?.duration || '';
        // YouTube Shorts are typically under 60s (PT60S or less)
        const isShort = /^PT(\d+)S$/.test(duration) && parseInt(duration.replace(/\D/g, '')) <= 60;
        const action_type = isShort ? 'short' : 'video';

        const description = video.snippet?.description || '';
        const title = video.snippet?.title || '';
        const has_thrft_mention = TRACKED_TAGS.some(t => title.includes(t) || description.includes(t));
        const has_presale_link = description.includes('thrft.app') || description.includes('presale');

        // Get XProfile for tier
        const xProfiles = await base44.asServiceRole.entities.XProfile.filter({ user_email: profile.user_email });
        const followers = xProfiles[0]?.followers_count || profile.followers_count || 0;
        const tier = getAccountTier(followers);
        const tier_multiplier = getTierMultiplier(tier);

        const { base, bonus, total } = calculateYouTubePoints({
          action_type, has_thrft_mention, has_presale_link, view_count, tier_multiplier
        });

        await base44.asServiceRole.entities.SocialActivity.create({
          user_email: profile.user_email,
          platform: 'youtube',
          platform_handle: profile.platform_handle,
          action_type,
          tracked_tag: `#${tag}`,
          content_id: video.id,
          content_text: title,
          has_media: true,
          has_presale_link,
          view_count: viewCount,
          base_points: base,
          bonus_points: bonus,
          points_earned: total,
          activity_date: video.snippet?.publishedAt || new Date().toISOString(),
        });

        // Update SocialProfile totals
        await base44.asServiceRole.entities.SocialProfile.update(profile.id, {
          total_points: (profile.total_points || 0) + total,
          post_count: (profile.post_count || 0) + 1,
          account_tier: tier,
          multiplier: tier_multiplier,
        });

        existingIds.add(video.id);
        totalCreated++;
      }
    }

    return Response.json({ success: true, platform: 'youtube', activities_created: totalCreated });
  } catch (error) {
    console.error('YouTube sync error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});