import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstagramUser {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
  website?: string;
}

interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  insights?: {
    reach?: number;
    impressions?: number;
    engagement?: number;
    saved?: number;
    shares?: number;
  };
}

interface InstagramInsights {
  follower_count?: number;
  impressions?: number;
  reach?: number;
  profile_views?: number;
  website_clicks?: number;
  email_contacts?: number;
  get_directions_clicks?: number;
  phone_call_clicks?: number;
  text_message_clicks?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, accessToken, userId, mediaId, period, metrics } = await req.json();
    
    console.log(`Instagram API request: action=${action}, userId=${userId}`);

    if (!accessToken) {
      throw new Error('Access token is required');
    }

    const baseUrl = 'https://graph.facebook.com/v18.0';
    let response;
    let data;

    switch (action) {
      case 'get_instagram_accounts': {
        // Get Instagram Business accounts linked to Facebook pages
        console.log('Fetching Instagram accounts from Facebook pages...');
        
        // First, get all Facebook pages the user manages
        response = await fetch(
          `${baseUrl}/me/accounts?fields=id,name,instagram_business_account{id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website}&access_token=${accessToken}`
        );
        data = await response.json();
        
        console.log('Facebook pages response:', JSON.stringify(data));
        
        if (data.error) {
          throw new Error(data.error.message);
        }

        // Extract Instagram accounts from pages
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
        // Get Instagram user profile
        console.log(`Fetching profile for Instagram user: ${userId}`);
        
        const fields = 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website';
        response = await fetch(
          `${baseUrl}/${userId}?fields=${fields}&access_token=${accessToken}`
        );
        data = await response.json();

        console.log('Profile response:', JSON.stringify(data));

        if (data.error) {
          throw new Error(data.error.message);
        }

        return new Response(JSON.stringify({ profile: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_media': {
        // Get user's media posts
        console.log(`Fetching media for Instagram user: ${userId}`);
        
        const mediaFields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count';
        response = await fetch(
          `${baseUrl}/${userId}/media?fields=${mediaFields}&limit=25&access_token=${accessToken}`
        );
        data = await response.json();

        console.log('Media response:', JSON.stringify(data));

        if (data.error) {
          throw new Error(data.error.message);
        }

        return new Response(JSON.stringify({ media: data.data || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_media_insights': {
        // Get insights for a specific media post
        console.log(`Fetching insights for media: ${mediaId}`);
        
        const insightMetrics = metrics || 'impressions,reach,engagement,saved,shares';
        response = await fetch(
          `${baseUrl}/${mediaId}/insights?metric=${insightMetrics}&access_token=${accessToken}`
        );
        data = await response.json();

        console.log('Media insights response:', JSON.stringify(data));

        if (data.error) {
          throw new Error(data.error.message);
        }

        // Transform insights data
        const insights: Record<string, number> = {};
        data.data?.forEach((item: any) => {
          insights[item.name] = item.values?.[0]?.value || 0;
        });

        return new Response(JSON.stringify({ insights }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_user_insights': {
        // Get account-level insights
        console.log(`Fetching insights for Instagram user: ${userId}, period: ${period}`);
        
        const insightPeriod = period || 'day';
        const insightMetrics = metrics || 'impressions,reach,profile_views,website_clicks,follower_count';
        
        response = await fetch(
          `${baseUrl}/${userId}/insights?metric=${insightMetrics}&period=${insightPeriod}&access_token=${accessToken}`
        );
        data = await response.json();

        console.log('User insights response:', JSON.stringify(data));

        if (data.error) {
          throw new Error(data.error.message);
        }

        // Transform insights data
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
        // Get audience demographics (age, gender, location)
        console.log(`Fetching audience demographics for: ${userId}`);
        
        response = await fetch(
          `${baseUrl}/${userId}/insights?metric=audience_city,audience_country,audience_gender_age,audience_locale&period=lifetime&access_token=${accessToken}`
        );
        data = await response.json();

        console.log('Demographics response:', JSON.stringify(data));

        if (data.error) {
          throw new Error(data.error.message);
        }

        // Transform demographics data
        const demographics: Record<string, any> = {};
        data.data?.forEach((item: any) => {
          demographics[item.name] = item.values?.[0]?.value || {};
        });

        return new Response(JSON.stringify({ demographics }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_online_followers': {
        // Get when followers are online
        console.log(`Fetching online followers data for: ${userId}`);
        
        response = await fetch(
          `${baseUrl}/${userId}/insights?metric=online_followers&period=lifetime&access_token=${accessToken}`
        );
        data = await response.json();

        console.log('Online followers response:', JSON.stringify(data));

        if (data.error) {
          throw new Error(data.error.message);
        }

        const onlineFollowers = data.data?.[0]?.values?.[0]?.value || {};

        return new Response(JSON.stringify({ onlineFollowers }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_stories': {
        // Get user's stories
        console.log(`Fetching stories for: ${userId}`);
        
        response = await fetch(
          `${baseUrl}/${userId}/stories?fields=id,media_type,media_url,permalink,timestamp&access_token=${accessToken}`
        );
        data = await response.json();

        console.log('Stories response:', JSON.stringify(data));

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
    console.error('Error in instagram-api function:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
