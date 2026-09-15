'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate input
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setIsLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (authError) {
        // Generic error to avoid leaking whether email exists
        setError('Invalid credentials. Please check your email and password.');
        return;
      }

      // Server verifies admin access — redirect and let layout handle it
      router.push('/admin/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-primary-dark)] to-[var(--color-primary)] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[var(--color-primary-subtle)] flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-[var(--color-primary)]" aria-hidden />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Admin Portal</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Sri Kanaka Durga Temple Navigation System</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4" aria-label="Admin login form" noValidate>
          {error && (
            <div
              className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700"
              role="alert"
              aria-live="polite"
            >
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Email Address
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="admin@example.com"
              required
              autoComplete="email"
              aria-required="true"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-12"
                placeholder="Enter password"
                required
                autoComplete="current-password"
                aria-required="true"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full mt-2"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center space-y-2">
          <button
            type="button"
            onClick={() => {
              // Set demo cookie (1 hour) then navigate to admin dashboard
              document.cookie = 'admin_demo=1; path=/; max-age=3600; SameSite=Lax';
              router.push('/admin/dashboard');
            }}
            className="inline-flex items-center justify-center gap-1.5 text-xs text-amber-900 hover:text-amber-950 font-bold bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2 rounded-xl transition-colors w-full cursor-pointer"
          >
            <span>Enter Demo Admin Dashboard →</span>
          </button>
          <div>
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-800 font-medium">
              ← Return to Pilgrim App
            </Link>
          </div>
        </div>

        <p className="text-xs text-center text-[var(--color-text-muted)] mt-4">
          Access restricted to authorized temple staff only.
          <br />
          Contact your administrator for access.
        </p>
      </div>
    </div>
  );
}
