import { supabase } from '@/integrations/supabase/client';

export async function getSupabaseJwt(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

export async function requireSupabaseJwt(): Promise<string> {
  const jwt = await getSupabaseJwt();
  if (!jwt) throw new Error('Not authenticated');
  return jwt;
}

