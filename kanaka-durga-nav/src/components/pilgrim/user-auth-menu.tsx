'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { LogIn, LogOut, X, Loader2, Shield, User } from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user-profile';

export function UserAuthMenu() {
  const locale = useLocale();
  const isTE = locale === 'te';
  const { user, profile, isAdmin, isLoading, isAuthenticated, signInWithGoogle, signOut } = useUserProfile();

  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      const { error } = await signInWithGoogle('/');
      if (error) {
        setErrorMsg(error.message);
        setIsSigningIn(false);
      }
    } catch {
      setErrorMsg('Failed to initialize Google login. Please try again.');
      setIsSigningIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse flex items-center justify-center" aria-hidden="true" />
    );
  }

  // ── Authenticated User: Avatar & Dropdown Menu ─────────────
  if (isAuthenticated && user) {
    const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Pilgrim';
    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;

    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 p-1 rounded-full hover:bg-white/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer"
          aria-expanded={isOpen}
          aria-label={isTE ? 'వినియోగదారు ప్రొఫైల్' : 'User profile'}
        >
          {avatarUrl ? (
            <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-300/40 shadow-xs">
              <Image
                src={avatarUrl}
                alt={displayName}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40 flex items-center justify-center font-bold text-xs uppercase shadow-xs">
              {displayName.charAt(0)}
            </div>
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white text-gray-800 shadow-2xl border border-gray-100 py-3 px-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="border-b border-gray-100 pb-3 mb-2">
              <p className="font-bold text-sm text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                  <User size={10} className="text-amber-700" />
                  <span>{isTE ? 'భక్తుడు' : 'Devotee / Pilgrim'}</span>
                </span>
                <span className="text-[10px] font-medium text-gray-400 uppercase">
                  {profile?.preferred_language === 'te' ? 'తెలుగు' : 'English'}
                </span>
              </div>
            </div>

            {/* If user is an authorized admin in admin_users, show Admin Portal link */}
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-2 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 rounded-xl transition-colors mb-1"
              >
                <Shield size={14} className="text-amber-700" aria-hidden="true" />
                <span>Admin Portal</span>
              </Link>
            )}

            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await signOut();
              }}
              className="w-full flex items-center gap-2 px-2 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut size={14} aria-hidden="true" />
              <span>{isTE ? 'లాగ్ అవుట్' : 'Sign Out'}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Unauthenticated User: Sign In Button & Modal ──────────
  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap"
        aria-label={isTE ? 'లాగిన్' : 'Sign In'}
      >
        <LogIn size={13} aria-hidden="true" />
        <span>{isTE ? 'లాగిన్' : 'Sign In'}</span>
      </button>

      {/* Sign In Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 space-y-5 text-gray-900">
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setErrorMsg(null);
              }}
              className="absolute right-4 top-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X size={18} aria-hidden="true" />
            </button>

            {/* Header branding */}
            <div className="text-center space-y-2 pt-2">
              <div className="w-14 h-14 rounded-full overflow-hidden mx-auto shadow-md border-2 border-amber-400/50">
                <Image
                  src="/durgamaatha.jpeg"
                  alt="Sri Kanaka Durga Temple"
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
              <h2
                id="auth-modal-title"
                className="text-base sm:text-lg font-bold text-gray-900 tracking-tight"
                style={{ fontFamily: isTE ? 'var(--font-telugu)' : "'Cinzel', Georgia, serif" }}
              >
                {isTE ? 'శ్రీ కనక దుర్గమ్మ దేవస్థానం' : 'Sri Kanaka Durga Temple'}
              </h2>
              <p className="text-sm font-semibold text-amber-800">
                {isTE ? 'స్వాగతం, భక్తులారా' : 'Welcome, Pilgrim'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            {/* Google Login Action */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 text-sm font-semibold shadow-xs transition-all cursor-pointer min-h-[48px] disabled:opacity-60"
              >
                {isSigningIn ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-gray-500" aria-hidden="true" />
                    <span>{isTE ? 'కనెక్ట్ అవుతోంది...' : 'Connecting to Google...'}</span>
                  </>
                ) : (
                  <>
                    {/* Official Google G Logo SVG */}
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                    <span>{isTE ? 'గూగుల్ తో లాగిన్ అవ్వండి' : 'Continue with Google'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Temple Officer / Admin Navigation Link */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>{isTE ? 'దేవాలయ సిబ్బంది / అడ్మిన్?' : 'Temple Officer / Admin?'}</span>
              <Link
                href="/admin/login"
                onClick={() => setIsModalOpen(false)}
                className="text-amber-800 hover:text-amber-950 font-bold underline inline-flex items-center gap-1"
              >
                <span>{isTE ? 'అడ్మిన్ పోర్టల్ →' : 'Admin Portal →'}</span>
              </Link>
            </div>

            <p className="text-[11px] text-center text-gray-400 pt-1">
              {isTE
                ? 'భక్తుల సౌకర్యార్థం ఉచిత నావిగేషన్ వ్యవస్థ • దసరా 2026'
                : 'Free pilgrim service by Sri Kanaka Durga Temple • Dasara 2026'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
