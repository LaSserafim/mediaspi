// Vercel Serverless Function — Public Aggregated User Activity Stats
// Uses SUPABASE_SERVICE_ROLE_KEY to query user_activity table server-side.
// Returns ONLY aggregate statistics — never user IDs, emails, or personal data.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wbnvjyfiegjsogvopyhz.supabase.co';

export default async function handler(req, res) {
  // Allow GET and OPTIONS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return res.status(500).json({
      error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY environment variable. Set this in the Vercel dashboard.'
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data, error } = await supabase
      .from('user_activity')
      .select('user_id, activity_date');

    if (error) {
      console.error('[Supabase user_activity error]', error);
      return res.status(500).json({ error: 'Failed to query user activity data' });
    }

    const records = data || [];
    const today = new Date().toISOString().slice(0, 10);

    // 1. Total distinct users across all of user_activity
    const allUsers = new Set(records.map(r => r.user_id).filter(Boolean));
    const totalUsers = allUsers.size;

    // 2. Distinct users active today
    const todayUsers = new Set(
      records.filter(r => r.activity_date === today).map(r => r.user_id).filter(Boolean)
    );
    const activeToday = todayUsers.size;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      totalUsers,
      activeToday
    });
  } catch (err) {
    console.error('[Activity stats error]', err);
    return res.status(500).json({ error: 'Internal server error processing activity stats' });
  }
}

