import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BEARER_TOKEN = Deno.env.get("X_BEARER_TOKEN");

async function searchRecentTweets(query, maxResults = 100) {
  const params = new URLSearchParams({
    query: `${query} -is:retweet`,
    max_results: Math.min(maxResults, 100).toString(),
    "tweet.fields": "created_at,author_id,referenced_tweets,text",
    "user.fields": "username,name,profile_image_url",
    expansions: "author_id,referenced_tweets.id",
  });

  const res = await fetch(
    `https://api.twitter.com/2/tweets/search/recent?${params}`,
    {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`X API error (${res.status}): ${err}`);
  }

  return res.json();
}

async function searchRetweets(query, maxResults = 100) {
  const params = new URLSearchParams({
    query: `${query} is:retweet`,
    max_results: Math.min(maxResults, 100).toString(),
    "tweet.fields": "created_at,author_id,referenced_tweets,text",
    "user.fields": "username,name,profile_image_url",
    expansions: "author_id,referenced_tweets.id",
  });

  const res = await fetch(
    `https://api.twitter.com/2/tweets/search/recent?${params}`,
    {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`X API retweet search error (${res.status}): ${err}`);
  }

  return res.json();
}

async function searchReplies(query, maxResults = 100) {
  const params = new URLSearchParams({
    query: `${query} is:reply`,
    max_results: Math.min(maxResults, 100).toString(),
    "tweet.fields": "created_at,author_id,referenced_tweets,text",
    "user.fields": "username,name,profile_image_url",
    expansions: "author_id,referenced_tweets.id",
  });

  const res = await fetch(
    `https://api.twitter.com/2/tweets/search/recent?${params}`,
    {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`X API reply search error (${res.status}): ${err}`);
  }

  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Point values per spec
    const basePointMap = { post: 2, thread: 2, repost: 1.5, quote_repost: 2, reply: 1, bookmark: 1.5 };

    // Get active tracked tags
    const tags = await base44.asServiceRole.entities.TrackedTag.filter({ is_active: true });
    if (tags.length === 0) {
      return Response.json({ message: "No active tracked tags found." });
    }

    // Get all registered XProfiles (handle -> profile map)
    const profiles = await base44.asServiceRole.entities.XProfile.list();
    const profilesByHandle = {};
    profiles.forEach((p) => {
      profilesByHandle[p.x_handle?.toLowerCase()] = p;
    });

    // Get existing activity tweet_ids to avoid duplicates
    const existingActivities = await base44.asServiceRole.entities.Activity.list("-created_date", 1000);
    const existingTweetIds = new Set(existingActivities.map((a) => a.tweet_id).filter(Boolean));

    let totalCreated = 0;
    const profileUpdates = {}; // handle -> { post_count, repost_count, reply_count, total_points }

    for (const trackedTag of tags) {
      const tag = trackedTag.tag;
      console.log(`Syncing tag: ${tag}`);

      // Fetch posts, retweets, replies in parallel
      const [postsData, retweetsData, repliesData] = await Promise.all([
        searchRecentTweets(tag, 100).catch((e) => { console.error("posts err:", e.message); return null; }),
        searchRetweets(tag, 100).catch((e) => { console.error("retweets err:", e.message); return null; }),
        searchReplies(tag, 100).catch((e) => { console.error("replies err:", e.message); return null; }),
      ]);

      // Build user lookup from expansions
      const userLookup = {};
      for (const dataset of [postsData, retweetsData, repliesData]) {
        if (dataset?.includes) {
          dataset.includes.users?.forEach((u) => {
            userLookup[u.id] = u;
          });
        }
      }

      const toProcess = [
        { data: postsData, action_type: "post" },
        { data: retweetsData, action_type: "repost" },
        { data: repliesData, action_type: "reply" },
      ];

      for (const { data, action_type } of toProcess) {
        if (!data?.data) continue;

        for (const tweet of data.data) {
          if (existingTweetIds.has(tweet.id)) continue;

          const author = userLookup[tweet.author_id];
          const handle = author?.username?.toLowerCase();
          if (!handle) continue;

          // Only track if handle is registered in the app
          const profile = profilesByHandle[handle];
          if (!profile) continue;

          // Calculate points with full spec
          const followers = profile?.followers_count || 0;
          const tier = followers >= 250000 ? 4 : followers >= 50000 ? 3 : followers >= 10000 ? 2 : 1;
          const tierMultiplier = { 1: 1.0, 2: 1.75, 3: 2.5, 4: 3.5 }[tier] || 1.0;
          const base = basePointMap[action_type] || 0;
          const earnedPoints = Math.round(base * tierMultiplier * 100) / 100;

          // Create activity record
          await base44.asServiceRole.entities.Activity.create({
            x_handle: author.username,
            user_email: profile.user_email,
            action_type,
            tracked_tag: tag,
            tweet_id: tweet.id,
            tweet_text: tweet.text,
            base_points: base,
            bonus_points: 0,
            points_earned: earnedPoints,
            activity_date: tweet.created_at,
          });

          existingTweetIds.add(tweet.id);
          totalCreated++;

          // Accumulate profile updates
          if (!profileUpdates[handle]) {
            profileUpdates[handle] = {
              profileId: profile.id,
              post_count: profile.post_count || 0,
              repost_count: profile.repost_count || 0,
              reply_count: profile.reply_count || 0,
              total_points: profile.total_points || 0,
            };
          }
          profileUpdates[handle].total_points += earnedPoints;
          profileUpdates[handle][`${action_type}_count`] += 1;
        }
      }
    }

    // Update profile stats
    for (const [handle, updates] of Object.entries(profileUpdates)) {
      const { profileId, ...stats } = updates;
      await base44.asServiceRole.entities.XProfile.update(profileId, stats);
      console.log(`Updated profile for @${handle}: +${updates.total_points - (profilesByHandle[handle]?.total_points || 0)} pts`);
    }

    return Response.json({
      success: true,
      activities_created: totalCreated,
      profiles_updated: Object.keys(profileUpdates).length,
      tags_synced: tags.length,
    });
  } catch (error) {
    console.error("Sync error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});