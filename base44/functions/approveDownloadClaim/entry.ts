import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { claim_id, action, admin_note } = await req.json();

    if (!claim_id || !action || !['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'claim_id and action (approve|reject) are required' }, { status: 400 });
    }

    const claims = await base44.asServiceRole.entities.AppDownloadClaim.filter({ id: claim_id });
    const claim = claims[0];
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });
    if (claim.status !== 'pending') return Response.json({ error: 'Claim already reviewed' }, { status: 409 });

    if (action === 'reject') {
      await base44.asServiceRole.entities.AppDownloadClaim.update(claim_id, {
        status: 'rejected',
        admin_note: admin_note || null,
      });
      return Response.json({ success: true, status: 'rejected' });
    }

    // Approve: award 1000 points
    const profiles = await base44.asServiceRole.entities.XProfile.filter({ user_email: claim.user_email });
    const profile = profiles[0];
    if (!profile) return Response.json({ error: 'User profile not found' }, { status: 404 });

    // Prevent double-awarding
    if (profile.app_download_verified) {
      await base44.asServiceRole.entities.AppDownloadClaim.update(claim_id, { status: 'rejected', admin_note: 'Already verified' });
      return Response.json({ error: 'User already received app download bonus' }, { status: 409 });
    }

    const pointsToAward = claim.points_awarded || 1000;

    await Promise.all([
      base44.asServiceRole.entities.AppDownloadClaim.update(claim_id, { status: 'approved' }),
      base44.asServiceRole.entities.XProfile.update(profile.id, {
        total_points: (profile.total_points || 0) + pointsToAward,
        app_download_verified: true,
      }),
      base44.asServiceRole.entities.Activity.create({
        x_handle: profile.x_handle,
        user_email: profile.user_email,
        action_type: 'post', // generic log
        tracked_tag: 'app_download',
        tweet_text: 'App download verified — bonus awarded',
        base_points: pointsToAward,
        bonus_points: 0,
        points_earned: pointsToAward,
        activity_date: new Date().toISOString(),
      }),
    ]);

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: profile.user_email,
      subject: `🎉 App Download Verified — 1,000 points awarded!`,
      body: `Hi @${profile.x_handle},\n\nYour THRFT app download has been verified!\n\nYou've been awarded 1,000 bonus points.\n\nYour new total: ${(profile.total_points || 0) + pointsToAward} points.\n\n— The THRFT Team`,
    });

    return Response.json({ success: true, status: 'approved', points_awarded: pointsToAward });
  } catch (error) {
    console.error("Approve claim error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});