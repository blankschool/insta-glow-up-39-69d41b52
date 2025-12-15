import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, accessToken, userId, mediaId, period, metrics } = await req.json();

    if (!accessToken) {
      throw new Error('Access token is required');
    }

    const baseUrl = 'https://graph.facebook.com/v18.0';
    let response;
    let data;

    switch (action) {
      case 'get_instagram_accounts': {
        response = await fetch(
          `${baseUrl}/me/accounts?fields=id,name,instagram_business_account{id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website}&access_token=${accessToken}`
        );
        data = await response.json();
        
        if (data.error) {
          throw new Error(data.error.message);
        }

        const instagramAccounts = data.data
          ?.filter((page: any) => page.instagram_business_account)
          .map((page: any) => ({
            pageId: page.id,
            pageName: page.name,
            instagram: page.instagram_business_account
          })) || [];

        return new Response(JSON.stringify({ accounts: instagramAccounts }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_user_profile': {
        const fields = 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website';
        response = await fetch(
          `${baseUrl}/${userId}?fields=${fields}&access_token=${accessToken}`
        );
        data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        return new Response(JSON.stringify({ profile: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_media': {
        const mediaFields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count';
        response = await fetch(
          `${baseUrl}/${userId}/media?fields=${mediaFields}&limit=25&access_token=${accessToken}`
        );
        data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        return new Response(JSON.stringify({ media: data.data || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_media_insights': {
        const insightMetrics = metrics || 'impressions,reach,engagement,saved,shares';
        response = await fetch(
          `${baseUrl}/${mediaId}/insights?metric=${insightMetrics}&access_token=${accessToken}`
        );
        data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        const insights: Record<string, number> = {};
        data.data?.forEach((item: any) => {
          insights[item.name] = item.values?.[0]?.value || 0;
        });

        return new Response(JSON.stringify({ insights }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_user_insights': {
        const insightPeriod = period || 'day';
        const insightMetrics = metrics || 'impressions,reach,profile_views,website_clicks,follower_count';
        
        response = await fetch(
          `${baseUrl}/${userId}/insights?metric=${insightMetrics}&period=${insightPeriod}&access_token=${accessToken}`
        );
        data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        const insights: Record<string, any> = {};
        data.data?.forEach((item: any) => {
          insights[item.name] = {
            values: item.values || [],
            title: item.title,
            description: item.description,
          };
        });

        return new Response(JSON.stringify({ insights }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_audience_demographics': {
        response = await fetch(
          `${baseUrl}/${userId}/insights?metric=audience_city,audience_country,audience_gender_age,audience_locale&period=lifetime&access_token=${accessToken}`
        );
        data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        const demographics: Record<string, any> = {};
        data.data?.forEach((item: any) => {
          demographics[item.name] = item.values?.[0]?.value || {};
        });

        return new Response(JSON.stringify({ demographics }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_online_followers': {
        response = await fetch(
          `${baseUrl}/${userId}/insights?metric=online_followers&period=lifetime&access_token=${accessToken}`
        );
        data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        const onlineFollowers = data.data?.[0]?.values?.[0]?.value || {};

        return new Response(JSON.stringify({ onlineFollowers }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_stories': {
        response = await fetch(
          `${baseUrl}/${userId}/stories?fields=id,media_type,media_url,permalink,timestamp&access_token=${accessToken}`
        );
        data = await response.json();

        if (data.error) {
          throw new Error(data.error.message);
        }

        return new Response(JSON.stringify({ stories: data.data || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in instagram-api function:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: error instanceof Error && errorMessage === 'Unauthorized' ? 401 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
