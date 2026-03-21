import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This runs as a scheduled job — use service role
    const profiles = await base44.asServiceRole.entities.XProfile.list();
    const allActivities = await base44.asServiceRole.entities.Activity.list("-created_date", 5000);

    let emailsSent = 0;

    for (const profile of profiles) {
      // Recalculate total points from all activities
      const userActivities = allActivities.filter(a => a.user_email === profile.user_email);
      
      // Get point configs
      const pointConfigs = await base44.asServiceRole.entities.PointConfig.list();
      const pointMap = {};
      pointConfigs.forEach(c => { pointMap[c.action_type] = c.points; });
      const defaultPts = { post: 10, repost: 5, reply: 3 };

      let totalPoints = 0;
      let postCount = 0, repostCount = 0, replyCount = 0;

      for (const activity of userActivities) {
        const basePoints = pointMap[activity.action_type] ?? defaultPts[activity.action_type] ?? 0;
        const multiplier = profile.multiplier || 1;
        totalPoints += basePoints * multiplier;
        if (activity.action_type === 'post') postCount++;
        if (activity.action_type === 'repost') repostCount++;
        if (activity.action_type === 'reply') replyCount++;
      }

      // Determine multiplier
      let multiplier = 1;
      const followers = profile.followers_count || 0;
      if (followers >= 100000) multiplier = 4;
      else if (followers >= 50000) multiplier = 3;
      else if (followers >= 25000) multiplier = 2;

      // High activity multiplier (2000+ actions in last 45 days)
      const cutoff = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      const recentActions = userActivities.filter(a => new Date(a.activity_date || a.created_date) > cutoff).length;
      if (recentActions >= 2000 && multiplier < 1.5) multiplier = 1.5;

      await base44.asServiceRole.entities.XProfile.update(profile.id, {
        total_points: Math.round(totalPoints),
        post_count: postCount,
        repost_count: repostCount,
        reply_count: replyCount,
        multiplier,
      });

      // Send weekly email summary
      if (profile.user_email && totalPoints > 0) {
        const weeklyActivities = userActivities.filter(a => {
          const d = new Date(a.activity_date || a.created_date);
          return d > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        });

        const weeklyPoints = weeklyActivities.reduce((sum, a) => {
          return sum + ((pointMap[a.action_type] ?? defaultPts[a.action_type] ?? 0) * multiplier);
        }, 0);

        if (weeklyPoints > 0) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: profile.user_email,
            subject: `Your Weekly XTracker Summary 🏆`,
            body: `
Hi @${profile.x_handle},

Here's your weekly engagement summary:

📊 This Week:
• Posts: ${weeklyActivities.filter(a => a.action_type === 'post').length}
• Reposts: ${weeklyActivities.filter(a => a.action_type === 'repost').length}
• Replies: ${weeklyActivities.filter(a => a.action_type === 'reply').length}
• Points Earned This Week: +${Math.round(weeklyPoints)}

🏅 Total Points: ${Math.round(totalPoints)}
${multiplier > 1 ? `⚡ Your ${multiplier}x multiplier is active!` : ''}

Keep engaging to climb the leaderboard!

— The XTracker Team
            `.trim(),
          });
          emailsSent++;
        }
      }
    }

    return Response.json({ success: true, profiles_updated: profiles.length, emails_sent: emailsSent });
  } catch (error) {
    console.error("Weekly recap error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});