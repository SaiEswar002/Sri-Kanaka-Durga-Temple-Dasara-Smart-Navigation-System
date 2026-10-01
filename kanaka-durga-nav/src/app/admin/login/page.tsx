'use client';

import { useState, Suspense } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError === 'unauthorized'
      ? 'Access denied. This account does not have an active administrator role.'
      : null
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email.trim(),
        password: parsed.data.password,
      });

      if (authError || !authData.user) {
        setError('Invalid email or password. Please check your credentials and try again.');
        return;
      }

      // Verify user has an active record in admin_users
      const { data: adminRecord } = await supabase
        .from('admin_users')
        .select('id, role_id, is_active, role:roles(slug)')
        .or(`auth_user_id.eq.${authData.user.id},email.eq.${parsed.data.email.trim().toLowerCase()}`)
        .eq('is_active', true)
        .maybeSingle();

      if (!adminRecord) {
        setError('Access denied. This account does not have an active administrator role.');
        await supabase.auth.signOut();
        return;
      }

      router.push('/admin/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=/admin/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setIsGoogleLoading(false);
      }
    } catch {
      setError('Failed to initiate Google administrator sign-in.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 border border-gray-100">
      {/* Logo — Durga Maa */}
      <div className="text-center mb-6">
        <div
          className="w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden mx-auto mb-3 shadow-lg"
          style={{ border: '3px solid var(--color-primary-muted)', boxShadow: '0 0 0 4px var(--color-primary-subtle)' }}
        >
          <Image
            src="/durgamaatha.jpeg"
            alt="Sri Kanaka Durga Maa"
            width={80}
            height={80}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        <h1
          className="text-xl font-bold text-gray-900 tracking-wider uppercase"
          style={{ fontFamily: "'Cinzel', Georgia, serif" }}
        >
          ADMIN PORTAL
        </h1>
        <p className="text-xs text-gray-500 mt-1">Sri Kanaka Durga Temple Navigation System</p>
      </div>

      {/* Error notification */}
      {error && (
        <div
          className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle size={15} className="shrink-0 mt-0.5" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4" aria-label="Admin sign-in form" noValidate>
        <div>
          <label htmlFor="admin-email" className="block text-xs font-semibold text-gray-700 mb-1">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input w-full"
            placeholder="officer@temple.org"
            required
            autoComplete="email"
            aria-required="true"
            disabled={isLoading || isGoogleLoading}
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="block text-xs font-semibold text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full pr-12"
              placeholder="Enter password"
              required
              autoComplete="current-password"
              aria-required="true"
              disabled={isLoading || isGoogleLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full py-3 text-sm font-bold shadow-md cursor-pointer flex items-center justify-center gap-2"
          disabled={isLoading || isGoogleLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Signing In...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Google Admin Login */}
      <button
        type="button"
        onClick={handleGoogleAdminLogin}
        disabled={isLoading || isGoogleLoading}
        className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-60"
      >
        {isGoogleLoading ? (
          <>
            <Loader2 size={15} className="animate-spin text-gray-500" />
            <span>Connecting Google Admin...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </>
        )}
      </button>

      <div className="mt-5 pt-3 border-t border-gray-100 text-center">
        <Link href="/" className="text-xs text-gray-500 hover:text-gray-800 font-medium">
          ← Return to Pilgrim App
        </Link>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-primary-dark to-primary flex items-center justify-center p-4">
      <Suspense fallback={<div className="bg-white rounded-3xl p-8 max-w-md w-full animate-pulse h-96" />}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
