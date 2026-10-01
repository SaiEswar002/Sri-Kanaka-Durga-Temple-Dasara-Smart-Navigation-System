'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';

export function useUserProfile() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch profile row from public.profiles and check admin_users
  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // 1. Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as UserProfile);
      }

      // 2. Check if user is an authorized active admin in admin_users
      // Note: RLS allows users to select their own admin_users record if auth_user_id matches
      const { data: adminRecord } = await supabase
        .from('admin_users')
        .select('id, is_active')
        .eq('auth_user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      setIsAdmin(!!adminRecord);
    } catch (err) {
      console.error('[useUserProfile] Error loading user info:', err);
    }
  }, [supabase]);

  useEffect(() => {
    // Initial user check
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchUserData(user.id);
      }
      setIsLoading(false);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchUserData(currentUser.id);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserData]);

  // Sign in with Google OAuth
  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const nextPath = redirectTo ?? '/';
    const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    return { data, error };
  }, [supabase]);

  // Sign out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  }, [supabase]);

  return {
    user,
    profile,
    isAdmin,
    isLoading,
    isAuthenticated: !!user,
    signInWithGoogle,
    signOut,
    refreshProfile: () => user && fetchUserData(user.id),
  };
}
