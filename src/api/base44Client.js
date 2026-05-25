// THRFT Airdrop — Supabase client
// Replaces Base44 SDK for the airdrop site

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: true, autoRefreshToken: true },
});

// Airdrop functions — wraps airdropTracker Edge Function
export const airdrop = {
    signup: (email, fullName, referralCode) =>
          supabase.functions.invoke('airdropTracker', {
                  body: { action: 'signup', email, full_name: fullName, referral_code: referralCode },
          }),

    completeTask: (email, taskKey, proofUrl, extra = {}) =>
          supabase.functions.invoke('airdropTracker', {
                  body: { action: 'complete_task', email, task_key: taskKey, proof_url: proofUrl, ...extra },
          }),

    getStatus: (email) =>
          supabase.functions.invoke('airdropTracker', {
                  body: { action: 'get_status', email },
          }),

    getLeaderboard: () =>
          supabase.functions.invoke('airdropTracker', {
                  body: { action: 'get_leaderboard' },
          }),

    getTasks: () =>
          supabase.functions.invoke('airdropTracker', {
                  body: { action: 'get_tasks' },
          }),
};

// Legacy base44 shim for existing pages
export const base44 = {
    functions: {
          invoke: (name, payload) => supabase.functions.invoke(name, { body: payload }),
    },
    auth: {
          me: async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  return user;
          },
          signOut: () => supabase.auth.signOut(),
    },
};

export default base44;
