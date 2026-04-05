import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Points awarded per confirmed referral
const REFERRAL_POINTS = 500;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // ── GET referral code & stats ──────────────────────────────────
    if (action === 'get_code') {
      // Referral code is just based on user email (base64 encoded, url-safe)
      const code = btoa(user.email).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' }[c]));

      const referrals = await base44.asServiceRole.entities.Referral.filter({ referrer_email: user.email });
      const confirmed = referrals.filter(r => r.status === 'confirmed');
      const totalPoints = confirmed.reduce((sum, r) => sum + (r.points_awarded || 0), 0);

      return Response.json({
        referral_code: code,
        referral_link: `https://airdrop.thrft.app/?ref=${code}`,
        total_referrals: referrals.length,
        confirmed_referrals: confirmed.length,
        total_points_earned: totalPoints,
        referrals,
      });
    }

    // ── SUBMIT a referral code (called when a new user registers) ──
    if (action === 'submit_code') {
      const { referral_code, platform = 'x' } = body;
      if (!referral_code) {
        return Response.json({ error: 'referral_code is required' }, { status: 400 });
      }

      // Decode referrer email from code
      let referrerEmail;
      try {
        const padded = referral_code.replace(/-/g, '+').replace(/_/g, '/');
        const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
        referrerEmail = atob(padded + pad);
      } catch {
        return Response.json({ error: 'Invalid referral code' }, { status: 400 });
      }

      if (referrerEmail === user.email) {
        return Response.json({ error: 'You cannot refer yourself' }, { status: 400 });
      }

      // Check if this user was already referred
      const existing = await base44.asServiceRole.entities.Referral.filter({ referred_email: user.email });
      if (existing.length > 0) {
        return Response.json({ error: 'You have already used a referral code' }, { status: 409 });
      }

      // Get referrer profile for handle
      const referrerProfiles = await base44.asServiceRole.entities.XProfile.filter({ user_email: referrerEmail });
      const referrerProfile = referrerProfiles[0] || null;

      // Get referred user profile
      const referredProfiles = await base44.asServiceRole.entities.XProfile.filter({ user_email: user.email });
      const referredProfile = referredProfiles[0] || null;

      // Create referral record
      const referral = await base44.asServiceRole.entities.Referral.create({
        referrer_email: referrerEmail,
        referrer_x_handle: referrerProfile?.x_handle || null,
        referred_email: user.email,
        referred_x_handle: referredProfile?.x_handle || null,
        platform,
        status: 'confirmed',
        points_awarded: REFERRAL_POINTS,
        referral_code,
      });

      // Award points to referrer
      if (referrerProfile) {
        await base44.asServiceRole.entities.XProfile.update(referrerProfile.id, {
          total_points: (referrerProfile.total_points || 0) + REFERRAL_POINTS,
        });

        // Notify referrer
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: referrerEmail,
          subject: `You earned ${REFERRAL_POINTS} referral points on THRFT! 🎉`,
          body: `Hi${referrerProfile.x_handle ? ` @${referrerProfile.x_handle}` : ''},\n\nSomeone joined THRFT Airdrop using your referral link!\n\nYou've been awarded ${REFERRAL_POINTS} points.\n\nKeep sharing your link to earn more!\n\n— The THRFT Team`,
        });
      }

      return Response.json({ success: true, referral, points_awarded: REFERRAL_POINTS });
    }

    // ── ADMIN: confirm or reject a referral ───────────────────────
    if (action === 'update_status') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }
      const { referral_id, status } = body;
      if (!referral_id || !status) {
        return Response.json({ error: 'referral_id and status required' }, { status: 400 });
      }
      const updated = await base44.asServiceRole.entities.Referral.update(referral_id, { status });
      return Response.json({ success: true, referral: updated });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('Referral error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});