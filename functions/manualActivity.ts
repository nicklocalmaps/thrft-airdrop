import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { x_handle, action_type, tracked_tag, tweet_id, tweet_text, activity_date } = body;

    if (!x_handle || !action_type || !tracked_tag) {
      return Response.json({ error: 'x_handle, action_type, and tracked_tag are required' }, { status: 400 });
    }

    // Check for duplicate tweet_id
    if (tweet_id) {
      const existing = await base44.asServiceRole.entities.Activity.filter({ tweet_id });
      if (existing.length > 0) {
        return Response.json({ error: 'Activity with this tweet ID already exists' }, { status: 409 });
      }
    }

    // Find the user profile
    const cleanHandle = x_handle.replace('@', '').toLowerCase();
    const profiles = await base44.asServiceRole.entities.XProfile.filter({ x_handle: cleanHandle });
    const profile = profiles[0] || null;

    // Get point configs
    const pointConfigs = await base44.asServiceRole.entities.PointConfig.list();
    const pointMap = {};
    pointConfigs.forEach(c => { pointMap[c.action_type] = c.points; });
    const defaultPts = { post: 10, repost: 5, reply: 3 };
    const basePoints = pointMap[action_type] ?? defaultPts[action_type] ?? 0;
    const multiplier = profile?.multiplier || 1;
    const points_earned = Math.round(basePoints * multiplier);

    // Create activity
    const activity = await base44.asServiceRole.entities.Activity.create({
      x_handle: cleanHandle,
      user_email: profile?.user_email || null,
      action_type,
      tracked_tag,
      tweet_id: tweet_id || null,
      tweet_text: tweet_text || null,
      points_earned,
      activity_date: activity_date || new Date().toISOString(),
    });

    // Update profile points if user is registered
    if (profile) {
      await base44.asServiceRole.entities.XProfile.update(profile.id, {
        total_points: (profile.total_points || 0) + points_earned,
        [`${action_type}_count`]: (profile[`${action_type}_count`] || 0) + 1,
      });

      // Send notification email
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: profile.user_email,
        subject: `You earned ${points_earned} points on XTracker! 🎉`,
        body: `Hi @${profile.x_handle},\n\nAn admin just manually awarded you ${points_earned} points for a ${action_type} on ${tracked_tag}.\n\nYour total is now ${(profile.total_points || 0) + points_earned} points.\n\n— The XTracker Team`,
      });
    }

    return Response.json({ success: true, activity, points_earned });
  } catch (error) {
    console.error("Manual activity error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});