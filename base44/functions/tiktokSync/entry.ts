import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY");
const CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET");
const TRACKED_HASHTAGS = ["THRFT", "THRFTapp", "THRFTairdrop"];

function getAccountTier(followers) {
  if (followers >= 250000) return 4;
  if (followers >= 50000) return 3;
  if (followers >= 10000) return 2;
  return 1;
}
function getTierMultiplier(tier) {
  return { 1: 1.0, 2: 1.75, 3: 2.5, 4: 3.5 }[tier] || 1.0;
}

function calculateTikTokPoints({ action_type, has_caption_mention, has_presale_link, view_count, tier_multiplier }) {
  let base = 0, bonus = 0;

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

  const total = (base + bonus) * (tier_multiplier || 1);
  return { base, bonus, total: Math.round(total * 100) / 100 };
}

async function getTikTokAccessToken() {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: CLIENT_KEY,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(`TikTok auth error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function searchTikTokVideos(accessToken, hashtag) {
  const res = await fetch('https://open.tiktokapis.com/v2/research/video/query/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: {
        and: [{ operation: 'IN', field_name: 'hashtag_name', field_values: [hashtag.toLowerCase()] }],
      },
      start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, ''),
      end_date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      max_count: 100,
      fields: 'id,username,video_description,view_count,like_count,comment_count,share_count,create_time',
    }),
  });
  if (!res.ok) throw new Error(`TikTok search error: ${res.status} ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    if (!CLIENT_KEY || !CLIENT_SECRET) {
      return Response.json({ error: 'TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET secrets are required.' }, { status: 400 });
    }

    // Load registered TikTok profiles
    const socialProfiles = await base44.asServiceRole.entities.SocialProfile.filter({ platform: 'tiktok' });
    if (socialProfiles.length === 0) return Response.json({ message: 'No TikTok profiles registered.' });

    const profilesByHandle = {};
    socialProfiles.forEach(p => {
      const key = p.platform_handle?.replace('@', '').toLowerCase();
      if (key) profilesByHandle[key] = p;
    });

    const existing = await base44.asServiceRole.entities.SocialActivity.filter({ platform: 'tiktok' });
    const existingIds = new Set(existing.map(a => a.content_id).filter(Boolean));

    let totalCreated = 0;

    const accessToken = await getTikTokAccessToken();

    for (const hashtag of TRACKED_HASHTAGS) {
      const data = await searchTikTokVideos(accessToken, hashtag).catch(e => {
        console.error(`TikTok hashtag #${hashtag}:`, e.message);
        return null;
      });

      const videos = data?.data?.videos || [];

      for (const video of videos) {
        if (existingIds.has(video.id)) continue;

        const username = video.username?.toLowerCase();
        const profile = profilesByHandle[username];
        if (!profile) continue;

        const view_count = video.view_count || 0;
        const description = video.video_description || '';
        const has_caption_mention = TRACKED_HASHTAGS.some(t => description.toLowerCase().includes(t.toLowerCase()));
        const has_presale_link = description.toLowerCase().includes('thrft.app') || description.toLowerCase().includes('presale');

        const xProfiles = await base44.asServiceRole.entities.XProfile.filter({ user_email: profile.user_email });
        const followers = xProfiles[0]?.followers_count || profile.followers_count || 0;
        const tier = getAccountTier(followers);
        const tier_multiplier = getTierMultiplier(tier);

        const { base, bonus, total } = calculateTikTokPoints({
          action_type: 'video',
          has_caption_mention,
          has_presale_link,
          view_count,
          tier_multiplier,
        });

        await base44.asServiceRole.entities.SocialActivity.create({
          user_email: profile.user_email,
          platform: 'tiktok',
          platform_handle: profile.platform_handle,
          action_type: 'video',
          tracked_tag: `#${hashtag}`,
          content_id: video.id,
          content_text: description.substring(0, 500),
          has_media: true,
          has_presale_link,
          view_count,
          likes_received: video.like_count || 0,
          comments_received: video.comment_count || 0,
          shares_received: video.share_count || 0,
          base_points: base,
          bonus_points: bonus,
          points_earned: total,
          activity_date: new Date(video.create_time * 1000).toISOString(),
        });

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

    return Response.json({ success: true, platform: 'tiktok', activities_created: totalCreated });
  } catch (error) {
    console.error('TikTok sync error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});