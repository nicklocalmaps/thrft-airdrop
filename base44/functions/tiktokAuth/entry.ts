import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TIKTOK_CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY");
const TIKTOK_CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET");
const REDIRECT_URI = "https://airdrop.thrft.app/tiktok-callback";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return Response.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    // Exchange code for access token
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return Response.json({ error: `TikTok token exchange failed: ${err}` }, { status: 400 });
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in, open_id } = tokenData;

    if (!access_token) {
      return Response.json({ error: 'No access token returned from TikTok' }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + (expires_in || 86400) * 1000).toISOString();

    // Fetch user profile from TikTok
    const profileRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username,follower_count",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    let tiktokHandle = open_id;
    let displayName = "";
    let avatarUrl = "";
    let followerCount = 0;

    if (profileRes.ok) {
      const profileData = await profileRes.json();
      const u = profileData?.data?.user;
      if (u) {
        tiktokHandle = u.username || u.open_id || open_id;
        displayName = u.display_name || tiktokHandle;
        avatarUrl = u.avatar_url || "";
        followerCount = u.follower_count || 0;
      }
    }

    // Upsert SocialProfile for TikTok
    const existing = await base44.entities.SocialProfile.filter({
      user_email: user.email,
      platform: "tiktok",
    });

    const profileData = {
      user_email: user.email,
      platform: "tiktok",
      platform_handle: tiktokHandle,
      platform_user_id: open_id,
      display_name: displayName,
      avatar_url: avatarUrl,
      followers_count: followerCount,
      is_connected: true,
      access_token,
      refresh_token,
      token_expires_at: expiresAt,
    };

    if (existing.length > 0) {
      await base44.entities.SocialProfile.update(existing[0].id, profileData);
    } else {
      await base44.entities.SocialProfile.create({ ...profileData, total_points: 0, post_count: 0 });
    }

    return Response.json({ success: true, handle: tiktokHandle, display_name: displayName });
  } catch (error) {
    console.error("TikTok auth error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});