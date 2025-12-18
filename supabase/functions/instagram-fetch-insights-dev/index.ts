import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * DEV ONLY
 * - Does NOT require Supabase Auth JWT at the gateway (verify_jwt=false in config.toml)
 * - Protected by X-Dev-Secret header (DEV_INSIGHTS_SECRET)
 * - Uses TEST_IG_USER_ID / TEST_IG_ACCESS_TOKEN Supabase secrets (server-side)
 *
 * Returns and caches snapshots under a fixed synthetic user_id (service role bypasses RLS).
 */

const allowedOrigins = [
  "https://insta-glow-up-39.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

const isDevOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) return true;
    const m = url.hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    if (m) {
      const secondOctet = Number(m[1]);
      return secondOctet >= 16 && secondOctet <= 31;
    }
    return false;
  } catch {
    return false;
  }
};

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = !!origin && (allowedOrigins.includes(origin) || isDevOrigin(origin));
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dev-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

type SnapshotRow = {
  id: string;
  user_id: string;
  instagram_user_id: string;
  date: string;
  created_at: string | null;
  profile_insights: any | null;
  demographics: any | null;
  posts: any[] | null;
  stories: any | null;
  online_followers: any | null;
};

const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
};

const isValidIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
};

async function fetchWithRetry(url: string, maxRetries = 5): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      const json = await res.clone().json();
      if (json.error?.code === 2) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return res;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      const delay = Math.pow(2, i) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

const graphJsonOrThrow = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `Graph API HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
};

const fetchGraphJson = async (url: string) => {
  const res = await fetchWithRetry(url);
  return await graphJsonOrThrow(res);
};

const fetchGraphWithFallback = async (urls: string[], requestId: string, label: string) => {
  let lastErr: unknown = null;
  for (const url of urls) {
    try {
      const data = await fetchGraphJson(url);
      if (data?.error) throw new Error(data.error.message || `${label} error`);
      return data;
    } catch (e) {
      lastErr = e;
      console.warn(`[instagram-fetch-insights-dev][${requestId}] ${label} failed, trying fallback...`, e instanceof Error ? e.message : e);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`${label} failed`);
};

const buildResponseFromSnapshot = (snapshot: SnapshotRow, maxPostsResponse: number) => {
  const posts = Array.isArray(snapshot.posts) ? snapshot.posts : [];
  const storiesData = snapshot.stories?.data || [];
  const storiesAggregate = snapshot.stories?.aggregate || {
    total_stories: 0,
    total_impressions: 0,
    total_reach: 0,
    total_replies: 0,
    total_exits: 0,
    total_taps_forward: 0,
    total_taps_back: 0,
    avg_completion_rate: 0,
  };

  return {
    success: true,
    profile_insights: snapshot.profile_insights,
    demographics: snapshot.demographics,
    posts: posts.slice(0, maxPostsResponse),
    total_posts: posts.length,
    stories: storiesData,
    stories_aggregate: storiesAggregate,
    online_followers: snapshot.online_followers ?? snapshot.profile_insights?.online_followers ?? null,
    snapshot_date: snapshot.date,
    provider: snapshot.profile_insights?.provider ?? "dev",
    username: snapshot.profile_insights?.username ?? null,
    messages: [],
    cached: true,
    cached_created_at: snapshot.created_at,
  };
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const devSecret = Deno.env.get("DEV_INSIGHTS_SECRET");
    const providedSecret = req.headers.get("x-dev-secret");
    if (!devSecret || providedSecret !== devSecret) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden", request_id: requestId }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const igUserId = Deno.env.get("TEST_IG_USER_ID");
    const accessToken = Deno.env.get("TEST_IG_ACCESS_TOKEN");
    const username = Deno.env.get("TEST_IG_USERNAME") || null;

    if (!igUserId || !accessToken) throw new Error("Missing TEST_IG_USER_ID / TEST_IG_ACCESS_TOKEN secrets");

    let requestedDate: string | null = null;
    let forceRefresh = false;
    let preferCache = true;
    let maxPostsResponse = 150;
    let cacheTtlMinutes = 60;
    try {
      const body = await req.json();
      requestedDate = body.date || null;
      forceRefresh = Boolean(body.forceRefresh);
      preferCache = body.preferCache === undefined ? true : Boolean(body.preferCache);
      maxPostsResponse = clampInt(body.maxPosts, 1, 500, 150);
      cacheTtlMinutes = clampInt(body.cacheTtlMinutes, 0, 24 * 60, 60);
    } catch {
      // optional body
    }

    if (requestedDate && !isValidIsoDate(requestedDate)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid date (expected YYYY-MM-DD)", request_id: requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const snapshotDate = requestedDate || today;
    const isToday = snapshotDate === today;

    if (preferCache) {
      const { data: existingSnapshot } = await supabase
        .from("account_snapshots")
        .select("*")
        .eq("user_id", DEV_USER_ID)
        .eq("instagram_user_id", igUserId)
        .eq("date", snapshotDate)
        .maybeSingle();

      const snapshot = existingSnapshot as unknown as SnapshotRow | null;
      if (snapshot && !forceRefresh) {
        const createdAtMs = snapshot.created_at ? new Date(snapshot.created_at).getTime() : 0;
        const ageMinutes = createdAtMs ? (Date.now() - createdAtMs) / 60000 : Number.POSITIVE_INFINITY;
        const shouldServeCached = !isToday || (cacheTtlMinutes > 0 && ageMinutes <= cacheTtlMinutes);
        if (shouldServeCached) {
          const duration = Date.now() - startTime;
          return new Response(JSON.stringify({ ...buildResponseFromSnapshot(snapshot, maxPostsResponse), duration_ms: duration, request_id: requestId }), {
            headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
          });
        }
      }
    }

    const profileMetricsPrimary = [
      "reach",
      "views",
      "accounts_engaged",
      "total_interactions",
      "likes",
      "comments",
      "shares",
      "saves",
      "replies",
      "profile_links_taps",
      "follows_and_unfollows",
      "follower_count",
    ].join(",");
    const profileMetricsFallback = ["reach", "views", "accounts_engaged", "total_interactions", "follower_count"].join(",");

    let profileInsights: any;
    try {
      profileInsights = await fetchGraphWithFallback(
        [
          `https://graph.facebook.com/v24.0/${igUserId}/insights?metric=${profileMetricsPrimary}&period=day&metric_type=total_value&access_token=${accessToken}`,
          `https://graph.facebook.com/v24.0/${igUserId}/insights?metric=${profileMetricsFallback}&period=day&metric_type=total_value&access_token=${accessToken}`,
        ],
        requestId,
        "Profile insights",
      );
    } catch (e) {
      profileInsights = { error: { message: e instanceof Error ? e.message : "Profile insights failed" } };
    }

    let demographics: any;
    try {
      demographics = await fetchGraphWithFallback(
        [
          `https://graph.facebook.com/v24.0/${igUserId}/insights?metric=follower_demographics,engaged_audience_demographics,reached_audience_demographics&period=lifetime&timeframe=last_30_days&metric_type=total_value&access_token=${accessToken}`,
          `https://graph.facebook.com/v24.0/${igUserId}/insights?metric=follower_demographics&period=lifetime&timeframe=last_30_days&metric_type=total_value&access_token=${accessToken}`,
        ],
        requestId,
        "Demographics",
      );
    } catch (e) {
      demographics = { error: { message: e instanceof Error ? e.message : "Demographics failed" } };
    }

    const mediaFields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
    let allPosts: any[] = [];
    let mediaUrl: string | null = `https://graph.facebook.com/v24.0/${igUserId}/media?fields=${mediaFields}&limit=100&access_token=${accessToken}`;
    const maxPages = 20;
    for (let i = 0; i < maxPages && mediaUrl; i++) {
      const mediaRes = await fetchWithRetry(mediaUrl);
      const mediaJson = await mediaRes.json();
      if (mediaJson.error) break;
      allPosts = [...allPosts, ...(mediaJson.data || [])];
      mediaUrl = mediaJson.paging?.next || null;
    }

    const imageMetricsPrimary = "reach,views,saved,shares,total_interactions";
    const imageMetricsFallback = "reach,saved";
    const videoMetricsPrimary = "reach,views,saved,shares,plays,total_interactions";
    const videoMetricsFallback = "reach,views,saved";

    const postsWithInsights = await Promise.all(
      allPosts.map(async (post: any) => {
        try {
          if (post.media_type === "CAROUSEL_ALBUM") {
            return {
              ...post,
              insights: {
                _note: "CAROUSEL_ALBUM insights not available via API",
                likes: post.like_count || 0,
                comments: post.comments_count || 0,
                engagement: (post.like_count || 0) + (post.comments_count || 0),
              },
            };
          }

          const isVideo = post.media_type === "VIDEO" || post.media_type === "REELS";
          const metricsPrimary = isVideo ? videoMetricsPrimary : imageMetricsPrimary;
          const metricsFallback = isVideo ? videoMetricsFallback : imageMetricsFallback;

          let piData: any;
          try {
            piData = await fetchGraphWithFallback(
              [
                `https://graph.facebook.com/v24.0/${post.id}/insights?metric=${metricsPrimary}&access_token=${accessToken}`,
                `https://graph.facebook.com/v24.0/${post.id}/insights?metric=${metricsFallback}&access_token=${accessToken}`,
              ],
              requestId,
              `Post insights ${post.id}`,
            );
          } catch (e) {
            piData = { error: { message: e instanceof Error ? e.message : "Post insights failed" } };
          }

          if (piData.error) {
            return {
              ...post,
              insights: {
                likes: post.like_count || 0,
                comments: post.comments_count || 0,
                engagement: (post.like_count || 0) + (post.comments_count || 0),
                _error: piData.error.message,
              },
            };
          }

          const insights = piData.data?.reduce((acc: any, m: any) => {
            acc[m.name] = m.values?.[0]?.value || 0;
            return acc;
          }, {}) || {};

          insights.likes = post.like_count || 0;
          insights.comments = post.comments_count || 0;
          insights.engagement = insights.total_interactions || (insights.likes + insights.comments + (insights.saved || 0) + (insights.shares || 0));

          return { ...post, insights };
        } catch (e) {
          return { ...post, insights: { likes: post.like_count || 0, comments: post.comments_count || 0, _error: e instanceof Error ? e.message : "Unknown" } };
        }
      }),
    );

    let storiesData: any[] = [];
    const storiesAggregate = {
      total_stories: 0,
      total_impressions: 0,
      total_reach: 0,
      total_replies: 0,
      total_exits: 0,
      total_taps_forward: 0,
      total_taps_back: 0,
      avg_completion_rate: 0,
    };

    try {
      const storiesJson = await fetchGraphJson(
        `https://graph.facebook.com/v24.0/${igUserId}/stories?fields=id,media_type,media_url,thumbnail_url,timestamp,permalink&access_token=${accessToken}`,
      );
      if (!storiesJson.error && storiesJson.data?.length > 0) {
        storiesData = await Promise.all(
          storiesJson.data.map(async (story: any) => {
            try {
              const siData = await fetchGraphJson(
                `https://graph.facebook.com/v24.0/${story.id}/insights?metric=impressions,reach,replies,taps_forward,taps_back,exits&access_token=${accessToken}`,
              );
              if (siData.error) return { ...story, insights: {} };
              const insights = siData.data?.reduce((acc: any, m: any) => {
                acc[m.name] = m.values?.[0]?.value || 0;
                return acc;
              }, {}) || {};
              insights.completion_rate = insights.impressions > 0 ? Math.round((1 - (insights.exits || 0) / insights.impressions) * 100) : 0;
              return { ...story, insights };
            } catch {
              return { ...story, insights: {} };
            }
          }),
        );

        storiesAggregate.total_stories = storiesData.length;
        storiesData.forEach((story: any) => {
          storiesAggregate.total_impressions += story.insights?.impressions || 0;
          storiesAggregate.total_reach += story.insights?.reach || 0;
          storiesAggregate.total_replies += story.insights?.replies || 0;
          storiesAggregate.total_exits += story.insights?.exits || 0;
          storiesAggregate.total_taps_forward += story.insights?.taps_forward || 0;
          storiesAggregate.total_taps_back += story.insights?.taps_back || 0;
        });
        if (storiesAggregate.total_impressions > 0) {
          storiesAggregate.avg_completion_rate = Math.round((1 - storiesAggregate.total_exits / storiesAggregate.total_impressions) * 100);
        }
      }
    } catch {
      // ignore
    }

    let onlineFollowers: any = null;
    try {
      const onlineJson = await fetchGraphJson(
        `https://graph.facebook.com/v24.0/${igUserId}/insights?metric=online_followers&period=lifetime&access_token=${accessToken}`,
      );
      if (!onlineJson.error && onlineJson.data?.[0]?.values?.[0]?.value) onlineFollowers = onlineJson.data[0].values[0].value;
    } catch {
      // ignore
    }

    const snapshotData = {
      user_id: DEV_USER_ID,
      instagram_user_id: igUserId,
      date: snapshotDate,
      profile_insights: profileInsights.error
        ? null
        : {
            data: profileInsights.data,
            online_followers: onlineFollowers,
            username,
            provider: "dev",
          },
      demographics: demographics.error ? null : demographics,
      posts: postsWithInsights,
      stories: { data: storiesData, aggregate: storiesAggregate },
      online_followers: onlineFollowers,
    };

    const { data: existingSnapshot } = await supabase
      .from("account_snapshots")
      .select("id")
      .eq("user_id", DEV_USER_ID)
      .eq("instagram_user_id", igUserId)
      .eq("date", snapshotDate)
      .maybeSingle();

    if (existingSnapshot) {
      await supabase.from("account_snapshots").update(snapshotData).eq("id", existingSnapshot.id);
    } else {
      await supabase.from("account_snapshots").insert(snapshotData);
    }

    const postInsightErrorCount = postsWithInsights.reduce((count: number, p: any) => count + (p?.insights?._error ? 1 : 0), 0);
    const messages = [
      profileInsights?.error?.message ? `Profile insights unavailable: ${profileInsights.error.message}` : null,
      demographics?.error?.message ? "Demographics require 100+ followers and may take up to 48h to appear." : null,
      storiesData.length === 0 ? "No active stories in the last 24 hours." : null,
      postInsightErrorCount > 0 ? `Post insights failed for ${postInsightErrorCount} posts.` : null,
    ].filter(Boolean);

    const duration = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        success: true,
        profile_insights: profileInsights.error ? null : profileInsights,
        demographics: demographics.error ? null : demographics,
        posts: postsWithInsights.slice(0, maxPostsResponse),
        total_posts: postsWithInsights.length,
        stories: storiesData,
        stories_aggregate: storiesAggregate,
        online_followers: onlineFollowers,
        snapshot_date: snapshotDate,
        duration_ms: duration,
        provider: "dev",
        username,
        request_id: requestId,
        messages,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
      },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const duration = Date.now() - startTime;
    return new Response(JSON.stringify({ success: false, error: msg, request_id: requestId, duration_ms: duration }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId },
    });
  }
});
