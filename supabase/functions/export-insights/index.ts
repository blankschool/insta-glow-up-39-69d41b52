import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Export Insights Edge Function
 * 
 * Exports Instagram analytics data in multiple AI-friendly formats:
 * - JSON (structured data for developers/AI)
 * - CSV (profile, posts, stories, demographics as separate files)
 * - NDJSON (newline-delimited JSON for streaming/fine-tuning)
 * - Markdown (formatted report with tables)
 * - TXT (prompt-ready text for AI analysis)
 */

const allowedOrigins = [
  'https://insta-glow-up-39.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[export-insights] Request started');

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // Parse request
    const body = await req.json();
    const { format, accountId } = body;

    if (!format || !accountId) {
      throw new Error('Missing format or accountId parameter');
    }

    // Get account info
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: account, error: accError } = await supabase
      .from('connected_accounts')
      .select('provider_account_id, account_username, account_name')
      .eq('user_id', user.id)
      .eq('id', accountId)
      .maybeSingle();

    if (accError || !account) throw new Error('Account not found');

    // Get latest snapshot
    const { data: snapshot, error: snapError } = await supabase
      .from('account_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .eq('instagram_user_id', account.provider_account_id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapError || !snapshot) throw new Error('No data available for export');

    const username = account.account_username || account.provider_account_id;
    const exportDate = snapshot.date;

    // Parse snapshot data
    const profileInsights = snapshot.profile_insights?.data || [];
    const demographics = snapshot.demographics?.data || [];
    const posts = snapshot.posts || [];
    const storiesData = snapshot.stories?.data || [];
    const storiesAggregate = snapshot.stories?.aggregate || {};

    // Calculate profile metrics
    const profileMetrics: Record<string, number> = {};
    profileInsights.forEach((m: any) => {
      profileMetrics[m.name] = m.values?.[0]?.value || 0;
    });

    // Calculate demographics breakdown
    const demoBreakdown: Record<string, any> = {};
    demographics.forEach((d: any) => {
      demoBreakdown[d.name] = d.values?.[0]?.value || {};
    });

    let responseData: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'json':
        responseData = JSON.stringify({
          meta: {
            username: `@${username}`,
            export_date: new Date().toISOString(),
            data_date: exportDate,
            format_version: '1.0',
          },
          profile_insights: profileMetrics,
          demographics: demoBreakdown,
          posts: posts.map((p: any) => ({
            id: p.id,
            caption: p.caption?.substring(0, 200),
            media_type: p.media_type,
            timestamp: p.timestamp,
            likes: p.like_count || 0,
            comments: p.comments_count || 0,
            reach: p.insights?.reach || 0,
            views: p.insights?.views || 0,
            engagement: p.insights?.engagement || 0,
            saved: p.insights?.saved || 0,
            shares: p.insights?.shares || 0,
          })),
          stories: {
            aggregate: storiesAggregate,
            items: storiesData.map((s: any) => ({
              id: s.id,
              media_type: s.media_type,
              timestamp: s.timestamp,
              impressions: s.insights?.impressions || 0,
              reach: s.insights?.reach || 0,
              replies: s.insights?.replies || 0,
              taps_forward: s.insights?.taps_forward || 0,
              taps_back: s.insights?.taps_back || 0,
              exits: s.insights?.exits || 0,
              completion_rate: s.insights?.completion_rate || 0,
            })),
          },
        }, null, 2);
        contentType = 'application/json';
        filename = `instagram_${username}_${exportDate}.json`;
        break;

      case 'ndjson':
        const ndjsonLines = [
          JSON.stringify({ type: 'meta', username: `@${username}`, date: exportDate }),
          JSON.stringify({ type: 'profile', ...profileMetrics }),
          JSON.stringify({ type: 'demographics', ...demoBreakdown }),
          ...posts.map((p: any) => JSON.stringify({
            type: 'post',
            id: p.id,
            caption: p.caption?.substring(0, 200),
            media_type: p.media_type,
            timestamp: p.timestamp,
            likes: p.like_count || 0,
            comments: p.comments_count || 0,
            ...p.insights,
          })),
          ...storiesData.map((s: any) => JSON.stringify({
            type: 'story',
            id: s.id,
            timestamp: s.timestamp,
            ...s.insights,
          })),
        ];
        responseData = ndjsonLines.join('\n');
        contentType = 'application/x-ndjson';
        filename = `instagram_${username}_${exportDate}.ndjson`;
        break;

      case 'csv':
        // Profile CSV
        const profileCsv = 'metric,value\n' + 
          Object.entries(profileMetrics).map(([k, v]) => `${k},${v}`).join('\n');
        
        // Posts CSV
        const postsCsvHeader = 'id,caption,media_type,timestamp,likes,comments,reach,views,engagement,saved,shares';
        const postsCsvRows = posts.map((p: any) => [
          p.id,
          `"${(p.caption || '').replace(/"/g, '""').substring(0, 100)}"`,
          p.media_type,
          p.timestamp,
          p.like_count || 0,
          p.comments_count || 0,
          p.insights?.reach || 0,
          p.insights?.views || 0,
          p.insights?.engagement || 0,
          p.insights?.saved || 0,
          p.insights?.shares || 0,
        ].join(','));
        const postsCsv = postsCsvHeader + '\n' + postsCsvRows.join('\n');
        
        // Stories CSV
        const storiesCsvHeader = 'id,timestamp,impressions,reach,replies,taps_forward,taps_back,exits,completion_rate';
        const storiesCsvRows = storiesData.map((s: any) => [
          s.id,
          s.timestamp,
          s.insights?.impressions || 0,
          s.insights?.reach || 0,
          s.insights?.replies || 0,
          s.insights?.taps_forward || 0,
          s.insights?.taps_back || 0,
          s.insights?.exits || 0,
          s.insights?.completion_rate || 0,
        ].join(','));
        const storiesCsv = storiesCsvHeader + '\n' + storiesCsvRows.join('\n');

        responseData = JSON.stringify({
          profile_insights: profileCsv,
          posts: postsCsv,
          stories: storiesCsv,
        });
        contentType = 'application/json';
        filename = `instagram_${username}_${exportDate}_csv.json`;
        break;

      case 'markdown':
        const totalLikes = posts.reduce((sum: number, p: any) => sum + (p.like_count || 0), 0);
        const totalComments = posts.reduce((sum: number, p: any) => sum + (p.comments_count || 0), 0);
        const avgEngagement = posts.length > 0 
          ? ((totalLikes + totalComments) / posts.length).toFixed(1)
          : '0';

        let md = `# Instagram Analytics Report\n\n`;
        md += `**Account:** @${username}\n`;
        md += `**Report Date:** ${exportDate}\n`;
        md += `**Generated:** ${new Date().toISOString()}\n\n`;
        
        md += `## Profile Overview\n\n`;
        md += `| Metric | Value |\n`;
        md += `|--------|-------|\n`;
        Object.entries(profileMetrics).forEach(([k, v]) => {
          md += `| ${k.replace(/_/g, ' ')} | ${(v as number).toLocaleString()} |\n`;
        });
        
        md += `\n## Posts Summary\n\n`;
        md += `- **Total Posts Analyzed:** ${posts.length}\n`;
        md += `- **Total Likes:** ${totalLikes.toLocaleString()}\n`;
        md += `- **Total Comments:** ${totalComments.toLocaleString()}\n`;
        md += `- **Average Engagement:** ${avgEngagement}\n\n`;
        
        md += `### Top 10 Posts by Engagement\n\n`;
        md += `| # | Type | Likes | Comments | Reach | Caption |\n`;
        md += `|---|------|-------|----------|-------|----------|\n`;
        const topPosts = [...posts]
          .sort((a, b) => ((b.like_count || 0) + (b.comments_count || 0)) - ((a.like_count || 0) + (a.comments_count || 0)))
          .slice(0, 10);
        topPosts.forEach((p: any, i: number) => {
          md += `| ${i + 1} | ${p.media_type} | ${p.like_count || 0} | ${p.comments_count || 0} | ${p.insights?.reach || 0} | ${(p.caption || '').substring(0, 30)}... |\n`;
        });

        if (storiesData.length > 0) {
          md += `\n## Stories Summary\n\n`;
          md += `- **Active Stories:** ${storiesAggregate.total_stories || 0}\n`;
          md += `- **Total Reach:** ${(storiesAggregate.total_reach || 0).toLocaleString()}\n`;
          md += `- **Total Impressions:** ${(storiesAggregate.total_impressions || 0).toLocaleString()}\n`;
          md += `- **Completion Rate:** ${storiesAggregate.avg_completion_rate || 0}%\n`;
          md += `- **Total Replies:** ${storiesAggregate.total_replies || 0}\n`;
        }

        responseData = md;
        contentType = 'text/markdown';
        filename = `instagram_${username}_${exportDate}.md`;
        break;

      case 'txt':
        const txtTotalLikes = posts.reduce((sum: number, p: any) => sum + (p.like_count || 0), 0);
        const txtTotalComments = posts.reduce((sum: number, p: any) => sum + (p.comments_count || 0), 0);
        const txtAvgEngagement = posts.length > 0 
          ? ((txtTotalLikes + txtTotalComments) / posts.length).toFixed(1)
          : '0';

        let txt = `You are a social media analyst expert. Here is all the Instagram data for @${username} on ${exportDate}:\n\n`;
        txt += `PROFILE METRICS:\n`;
        Object.entries(profileMetrics).forEach(([k, v]) => {
          txt += `- ${k.replace(/_/g, ' ')}: ${(v as number).toLocaleString()}\n`;
        });
        
        txt += `\nPOST ANALYTICS (${posts.length} posts analyzed):\n`;
        txt += `- Total Likes: ${txtTotalLikes.toLocaleString()}\n`;
        txt += `- Total Comments: ${txtTotalComments.toLocaleString()}\n`;
        txt += `- Average Engagement per Post: ${txtAvgEngagement}\n`;
        
        txt += `\nTOP 20 POSTS:\n`;
        const txtTopPosts = [...posts]
          .sort((a, b) => ((b.like_count || 0) + (b.comments_count || 0)) - ((a.like_count || 0) + (a.comments_count || 0)))
          .slice(0, 20);
        txtTopPosts.forEach((p: any, i: number) => {
          txt += `${i + 1}. [${p.media_type}] ${p.like_count || 0} likes, ${p.comments_count || 0} comments, reach: ${p.insights?.reach || 0} - "${(p.caption || 'No caption').substring(0, 50)}..."\n`;
        });

        if (storiesData.length > 0) {
          txt += `\nSTORIES (last 24h):\n`;
          txt += `- Active Stories: ${storiesAggregate.total_stories || 0}\n`;
          txt += `- Total Reach: ${(storiesAggregate.total_reach || 0).toLocaleString()}\n`;
          txt += `- Completion Rate: ${storiesAggregate.avg_completion_rate || 0}%\n`;
          txt += `- Replies: ${storiesAggregate.total_replies || 0}\n`;
        }

        txt += `\nAnalyze trends, suggest improvements, and identify patterns in this data.`;

        responseData = txt;
        contentType = 'text/plain';
        filename = `instagram_${username}_${exportDate}.txt`;
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    console.log('[export-insights] Export complete, format:', format);

    return new Response(JSON.stringify({
      success: true,
      data: responseData,
      filename,
      contentType,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[export-insights] Error:', msg);
    
    return new Response(JSON.stringify({ error: msg, success: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
