'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import {
  Navigation, Car, Cross, Utensils,
  MapPinOff, PhoneCall, Compass
} from 'lucide-react';
import { useLocation } from '@/hooks/use-location';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const locale = useLocale();
  const isTE = locale === 'te';

  const { location, permissionState, requestLocation } = useLocation({ autoRequest: false });

  // 4 primary facility actions sharing a unified, harmonious temple design system
  const QUICK_ACTIONS = [
    {
      href: '/navigate',
      icon: Navigation,
      title: isTE ? 'లైవ్ మ్యాప్' : 'Live Map',
      desc: isTE ? 'ఆలయ ప్రాంగణం & మార్గాలు' : 'Explore temple facilities',
    },
    {
      href: '/parking',
      icon: Car,
      title: isTE ? 'పార్కింగ్' : 'Parking',
      desc: isTE ? 'వాహన పార్కింగ్ స్థలాలు' : 'Find available parking',
    },
    {
      href: '/medical',
      icon: Cross,
      title: isTE ? 'వైద్యం' : 'Medical',
      desc: isTE ? 'వైద్య సహాయ కేంద్రాలు' : 'Find medical help',
    },
    {
      href: '/food',
      icon: Utensils,
      title: isTE ? 'అన్నదానం' : 'Annadanam',
      desc: isTE ? 'ఉచిత ప్రసాదం & భోజనం' : 'Find food distribution',
    },
  ] as const;

  return (
    <div className="w-full">

      {/* ═══════════════════════════════════════════════════════
          1. FULL-WIDTH DEVOTIONAL HERO HEADER WITH LATTICE TEXTURE
          ═══════════════════════════════════════════════════════ */}
      <section
        className="devotional-header w-full text-white relative shadow-md"
        aria-label="Temple welcome and navigation hero"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">

          {/* Temple Diya Badge & Subtitle */}
          <div className="flex items-center gap-2 mb-3">
            {/* Gold Diya vector icon (NO EMOJIS) */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(242,201,76,0.2)', border: '1px solid rgba(242,201,76,0.35)' }}
              aria-hidden="true"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C10.5 2 9.5 3 9.5 4.5C9.5 6 10.5 7 12 7C13.5 7 14.5 6 14.5 4.5C14.5 3 13.5 2 12 2Z" fill="#F2C94C"/>
                <path d="M12 8C9 8 7 10 7 13C7 16 9 18 12 22C15 18 17 16 17 13C17 10 15 8 12 8Z" fill="#FBBF24"/>
                <circle cx="12" cy="13" r="2.5" fill="#FFF8E7" opacity="0.9"/>
              </svg>
            </div>
            <span
              className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-amber-200"
              style={{ fontFamily: isTE ? 'var(--font-telugu)' : "'Forum', Georgia, serif" }}
            >
              {isTE ? 'శ్రీ కనక దుర్గమ్మ దేవస్థానం • ఇంద్రకీలాద్రి, విజయవాడ' : 'SRI KANAKA DURGA TEMPLE • INDRAKEELADRI, VIJAYAWADA'}
            </span>
          </div>

          {/* Main Title — Cinzel font for temple brand */}
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight"
            style={{
              fontFamily: isTE ? 'var(--font-telugu)' : "'Cinzel', Georgia, serif",
              letterSpacing: isTE ? '0' : '0.03em',
              lineHeight: isTE ? '1.3' : '1.15',
            }}
          >
            {isTE ? 'దసరా స్మార్ట్ నావిగేషన్' : 'DASARA SMART NAVIGATION'}
          </h1>

          {/* Subtitle — Cormorant Garamond / Telugu */}
          <p
            className="mt-3 text-sm sm:text-base max-w-2xl leading-relaxed text-white/88"
            style={{
              fontFamily: isTE ? 'var(--font-telugu)' : "'Cormorant Garamond', Georgia, serif",
              fontSize: isTE ? '0.9rem' : '1.15rem',
            }}
          >
            {isTE
              ? 'ఉచిత పార్కింగ్, అన్నదానం, వైద్య శిబిరాలు మరియు ఘాట్ రోడ్ రూట్ సమాచారం క్షణాల్లో తెలుసుకోండి.'
              : 'Real-time pilgrim guidance for free parking, Annadanam meals, medical camps, and Ghat road navigation.'}
          </p>

          {/* Action Row */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {/* GPS Location status / prompt */}
            {permissionState === 'granted' && location ? (
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2 backdrop-blur-xs text-xs font-semibold text-white"
                style={{ background: 'rgba(22,128,60,0.3)', border: '1px solid rgba(74,222,128,0.4)' }}
              >
                <Navigation size={13} className="text-emerald-300" aria-hidden="true" />
                <span>{isTE ? 'GPS యాక్టివ్' : 'GPS Active'}</span>
                <span className="text-emerald-200 font-mono">±{Math.round(location.accuracy)}m</span>
              </div>
            ) : permissionState === 'denied' ? (
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2 backdrop-blur-xs text-xs font-medium text-white/90"
                style={{ background: 'rgba(198,40,40,0.25)', border: '1px solid rgba(248,113,113,0.3)' }}
              >
                <MapPinOff size={13} className="text-red-300" aria-hidden="true" />
                <span>{isTE ? 'లొకేషన్ ఆఫ్ చేయబడింది' : 'Location not shared'}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={requestLocation}
                className="flex items-center gap-2 rounded-full px-4 py-2 backdrop-blur-xs text-xs font-semibold text-white transition-all hover:bg-white/20 cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
                aria-label={isTE ? 'లొకేషన్ షేర్ చేయండి' : 'Share location'}
              >
                <Navigation size={13} className="text-amber-300" aria-hidden="true" />
                <span>{isTE ? 'లొకేషన్ షేర్ చేయండి' : 'Share your location for better navigation'}</span>
              </button>
            )}

            {/* Primary Navigation Button */}
            <Link
              href="/navigate"
              className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-full text-xs sm:text-sm shadow-md transition-all hover:scale-105 active:scale-95 text-[#2B1D0E]"
              style={{ background: 'var(--color-gold)' }}
              aria-label={isTE ? 'లైవ్ నావిగేషన్ ప్రారంభించండి' : 'Start Navigation'}
            >
              <Compass size={16} aria-hidden="true" />
              <span>{isTE ? 'లైవ్ నావిగేషన్ ప్రారంభించండి' : 'Start Navigation'}</span>
            </Link>
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          2. MAIN CONTENT AREA
          ═══════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* ── QUICK ACTIONS (4 CORE FACILITIES) ─────────────── */}
        <section aria-labelledby="quick-actions-heading" className="space-y-3">
          <div>
            <h2
              id="quick-actions-heading"
              className="text-lg sm:text-xl font-bold tracking-wide text-[#2B2118]"
              style={{ fontFamily: isTE ? 'var(--font-telugu)' : "'Cinzel', Georgia, serif" }}
            >
              {isTE ? 'ప్రధాన సేవలు' : 'QUICK ACTIONS'}
            </h2>
            <p className="text-xs text-[#6B5E51] mt-0.5" style={{ fontFamily: isTE ? 'var(--font-telugu)' : 'var(--font-sans)' }}>
              {isTE ? 'సదుపాయాన్ని ఎంచుకుని నేరుగా నావిగేట్ అవ్వండి' : 'Select a facility to view details and directions'}
            </p>
          </div>

          {/* 4 Cards in unified temple palette */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {QUICK_ACTIONS.map(({ href, icon: Icon, title, desc }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center justify-center',
                  'bg-[#FFFDF9] border border-[#E8DCC8] shadow-[0_2px_8px_rgba(43,33,24,0.05)]',
                  'hover:border-[#D4A017] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:bg-[#FAF6ED]',
                  'transition-all duration-150 min-h-[125px] sm:min-h-[140px] no-underline'
                )}
                aria-label={`${title} — ${desc}`}
              >
                {/* Icon container */}
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform duration-150"
                  style={{
                    background: 'linear-gradient(135deg, #FAF3E6 0%, #F5E8D0 100%)',
                    border: '1px solid #ECD9B9',
                    color: '#8B142D',
                  }}
                >
                  <Icon size={24} strokeWidth={2.2} aria-hidden="true" />
                </div>

                {/* Title */}
                <span
                  className="font-bold text-sm sm:text-base text-[#2B2118] group-hover:text-[#8B142D] transition-colors leading-tight"
                  style={{ fontFamily: isTE ? 'var(--font-telugu)' : 'var(--font-sans)' }}
                >
                  {title}
                </span>

                {/* Description */}
                <span
                  className="text-[11px] sm:text-xs text-[#6B5E51] mt-1 leading-snug line-clamp-2"
                  style={{ fontFamily: isTE ? 'var(--font-telugu)' : 'var(--font-sans)' }}
                >
                  {desc}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── IMPORTANT HELP (COMPACT SAFETY ACTION — NO EMOJIS) ── */}
        <section
          className="rounded-2xl p-4 sm:p-5 border border-[#F2D0D0] bg-[#FFFBFB] shadow-xs"
          role="complementary"
          aria-label="Emergency help and telephone hotlines"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3
                className="text-xs sm:text-sm font-bold text-[#8B142D] flex items-center gap-2"
                style={{ fontFamily: isTE ? 'var(--font-telugu)' : 'var(--font-sans)' }}
              >
                <PhoneCall size={15} className="text-red-600 shrink-0" aria-hidden="true" />
                <span>{isTE ? 'అత్యవసర వైద్య సహాయం కావాలా?' : 'Need medical assistance?'}</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-[#7A3E3E]">
                {isTE
                  ? 'ఒక్క ట్యాప్‌తో అత్యవసర సేవలకు నేరుగా కాల్ చేయండి:'
                  : 'Direct one-tap calling for ambulance and emergency response:'}
              </p>
            </div>

            {/* Simple call actions (NO EMOJIS) */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href="tel:108"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-red-200 text-[#8B142D] hover:bg-red-50 text-xs font-bold shadow-2xs transition-colors min-h-[42px]"
                aria-label="Call 108 for Ambulance"
              >
                <PhoneCall size={13} className="text-red-600 shrink-0" aria-hidden="true" />
                <span>{isTE ? '108 అంబులెన్స్' : 'Call 108 (Ambulance)'}</span>
              </a>

              <a
                href="tel:112"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-red-200 text-[#8B142D] hover:bg-red-50 text-xs font-bold shadow-2xs transition-colors min-h-[42px]"
                aria-label="Call 112 for Police and Emergency"
              >
                <PhoneCall size={13} className="text-red-600 shrink-0" aria-hidden="true" />
                <span>{isTE ? '112 అత్యవసరం' : 'Call 112 (Emergency)'}</span>
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER / BASIC INFO (NO EMOJIS) ───────────────── */}
        <footer className="pt-2 pb-6 text-center space-y-2 text-[#7A6B5C]" role="contentinfo">
          <div className="flex items-center justify-center gap-2">
            <div
              className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-amber-400/40 shadow-2xs"
              aria-hidden="true"
            >
              <Image
                src="/durgamaatha.jpeg"
                alt="Sri Kanaka Durga Temple"
                width={28}
                height={28}
                className="w-full h-full object-cover"
              />
            </div>
            <span
              className="text-xs font-bold text-[#2B2118]"
              style={{ fontFamily: isTE ? 'var(--font-telugu)' : "'Cinzel', Georgia, serif" }}
            >
              {isTE ? 'శ్రీ కనక దుర్గమ్మ దేవస్థానం' : 'Sri Kanaka Durga Temple'}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed">
            {isTE
              ? 'ఇంద్రకీలాద్రి, విజయవాడ • దసరా నవరాత్రి మహోత్సవాలు 2026 • స్మార్ట్ నావిగేషన్'
              : 'Indrakeeladri, Vijayawada • Dasara Mahotsavam 2026 • Smart Navigation'}
          </p>
        </footer>

      </div>

    </div>
  );
}
