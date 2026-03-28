import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TIKTOK_CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY");
const TIKTOK_CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET");

async function refreshTikTokToken(refreshToken) {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: TIKTOK_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${await res.text()}`);
  }

  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Refresh all TikTok tokens that are expiring within 24 hours
    const profiles = await base44.asServiceRole.entities.SocialProfile.filter({ platform: "tiktok", is_connected: true });
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let refreshed = 0;
    let failed = 0;

    for (const profile of profiles) {
      if (!profile.refresh_token) continue;
      if (profile.token_expires_at && new Date(profile.token_expires_at) > soon) continue;

      try {
        const tokenData = await refreshTikTokToken(profile.refresh_token);
        const expiresAt = new Date(Date.now() + (tokenData.expires_in || 86400) * 1000).toISOString();

        await base44.asServiceRole.entities.SocialProfile.update(profile.id, {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || profile.refresh_token,
          token_expires_at: expiresAt,
        });
        refreshed++;
      } catch (e) {
        console.error(`Failed to refresh token for ${profile.platform_handle}:`, e.message);
        failed++;
      }
    }

    return Response.json({ success: true, refreshed, failed, total: profiles.length });
  } catch (error) {
    console.error("Token refresh error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});