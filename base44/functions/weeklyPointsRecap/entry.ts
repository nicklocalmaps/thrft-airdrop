import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function getAccountTier(followers) {
  if (followers >= 250000) return 4;
  if (followers >= 50000) return 3;
  if (followers >= 10000) return 2;
  return 1;
}

function getTierMultiplier(tier) {
  const multipliers = { 1: 1.0, 2: 1.75, 3: 2.5, 4: 3.5 };
  return multipliers[tier] || 1.0;
}

// Velocity multiplier: based on actions per hour in the last 7 days
// Placeholder logic until X API provides real-time data
function getVelocityMultiplier(recentActivities) {
  // Approximate: count total actions in last 7 days
  const totalActions = recentActivities.length;
  const hours = 7 * 24;
  const avgActionsPerHour = totalActions / hours;

  if (avgActionsPerHour >= 50) return 2.0;
  if (avgActionsPerHour >= 25) return 1.5;
  if (avgActionsPerHour >= 10) return 1.2;
  return 1.0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const profiles = await base44.asServiceRole.entities.XProfile.list();
    const allActivities = await base44.asServiceRole.entities.Activity.list("-created_date", 10000);

    let emailsSent = 0;
    const weekCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    for (const profile of profiles) {
      const userActivities = allActivities.filter(a => a.user_email === profile.user_email);
      const recentActivities = userActivities.filter(a => new Date(a.activity_date || a.created_date) > weekCutoff);

      const followers = profile.followers_count || 0;
      const tier = getAccountTier(followers);
      const tierMultiplier = getTierMultiplier(tier);
      const velocityMultiplier = getVelocityMultiplier(recentActivities);

      // Recount action types
      const counts = { post: 0, repost: 0, quote_repost: 0, reply: 0, bookmark: 0, thread: 0 };
      for (const a of userActivities) {
        if (counts[a.action_type] !== undefined) counts[a.action_type]++;
      }

      // Total points = sum of stored points_earned on each activity
      const totalPoints = userActivities.reduce((sum, a) => sum + (a.points_earned || 0), 0);
      const weeklyPoints = recentActivities.reduce((sum, a) => sum + (a.points_earned || 0), 0);

      await base44.asServiceRole.entities.XProfile.update(profile.id, {
        total_points: Math.round(totalPoints),
        account_tier: tier,
        multiplier: tierMultiplier,
        velocity_multiplier: velocityMultiplier,
        post_count: counts.post,
        repost_count: counts.repost,
        quote_repost_count: counts.quote_repost,
        reply_count: counts.reply,
        bookmark_count: counts.bookmark,
        thread_count: counts.thread,
      });

      // Weekly email
      if (profile.user_email && weeklyPoints > 0) {
        const tierLabels = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Tier 3 (KOL)', 4: 'Tier 4 (Top KOL)' };
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: profile.user_email,
          subject: `Your Weekly THRFT Airdrop Summary 🏆`,
          body: `
Hi @${profile.x_handle},

Here's your weekly engagement summary:

📊 This Week:
• Posts: ${recentActivities.filter(a => a.action_type === 'post').length}
• Threads: ${recentActivities.filter(a => a.action_type === 'thread').length}
• Reposts: ${recentActivities.filter(a => a.action_type === 'repost').length}
• Quote Reposts: ${recentActivities.filter(a => a.action_type === 'quote_repost').length}
• Replies: ${recentActivities.filter(a => a.action_type === 'reply').length}
• Bookmarks: ${recentActivities.filter(a => a.action_type === 'bookmark').length}
• Points Earned This Week: +${Math.round(weeklyPoints)}

🏅 Total Points: ${Math.round(totalPoints)}
⚡ Account: ${tierLabels[tier]} (${tierMultiplier}x multiplier)
${velocityMultiplier > 1 ? `🚀 Velocity Bonus: ${velocityMultiplier}x active!` : ''}

Keep engaging to climb the leaderboard!

— The THRFT Team
          `.trim(),
        });
        emailsSent++;
      }
    }

    return Response.json({ success: true, profiles_updated: profiles.length, emails_sent: emailsSent });
  } catch (error) {
    console.error("Weekly recap error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});