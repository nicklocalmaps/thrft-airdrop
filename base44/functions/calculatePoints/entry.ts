// ─────────────────────────────────────────────────────────────────
// THRFT Unified Point Calculation Reference
// Copy/inline the functions you need into other backend functions.
// (Deno deploy does not support local imports between functions.)
// ─────────────────────────────────────────────────────────────────

// This file exists as a reference only and is not deployed as an endpoint.
// All point logic is inlined into each sync function.

/*
ACCOUNT TIERS:
  <10K  → 1.0x
  10K-50K → 1.75x
  50K-250K → 2.5x
  250K+ → 3.5x

MEDIA MULTIPLIERS:
  text-only → 1.0x
  image/GIF → 1.5x
  short video (TikTok, YouTube Shorts) → 2.0x
  long video (YouTube) → 2.5x

VELOCITY MULTIPLIERS:
  10+ actions/hr → 1.2x
  25+ actions/hr → 1.5x
  50+ actions/hr → 2.0x

X.COM:
  post=2, thread=2(+3 bonus), repost=1.5, quote=2, reply=1, bookmark=1.5
  +2 media, +2 presale link
  reply to 10K+ = +2, 100K+ = +5
  engagement received: reply=1, repost=1.5, bookmark=1.5

TELEGRAM:
  message=1, message+media=2, presale link=3
  reactions=0.5 each, replies=1 each
  invite new member=5, active invite=10
  share in other groups=3, viral (100+ views/reactions)=+20

DISCORD:
  message=1, message+media=2, thread=3
  reactions=0.5 each, replies=1 each
  invite=5, active invite=10
  high-engagement thread (25+ replies)=+25

YOUTUBE:
  short=10, long=25
  +10 mention, +15 presale link
  like=1, comment=2, share=3
  views: 1K=+20, 5K=+75, 10K=+150, 50K+=+500
  media multiplier: short=2.0x, long=2.5x

TIKTOK:
  video=8, +5 caption mention, +5 presale link
  like=1, comment=2, share=3
  views: 1K=+10, 10K=+50, 50K=+200, 100K=+500, 1M+=+2000
  media multiplier: 2.0x (all TikTok = short video)

GLOBAL IMPRESSION BONUS:
  1K=+5, 10K=+25, 50K=+100, 100K=+250, 1M+=+1000

CROSS-PLATFORM SYNERGY:
  same content on 3 platforms = +10
  same content on all 5 = +25

REFERRAL/CAPITAL:
  wallet signup = +10
  $100 = +25, $1000 = +300, $10K = +5000
*/

Deno.serve(async (_req) => {
  return Response.json({
    message: "This is a reference file. See comments for full point system spec.",
    platforms: ["x", "telegram", "discord", "youtube", "tiktok"],
  });
});