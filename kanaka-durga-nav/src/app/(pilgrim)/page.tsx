'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import {
  MapPin, MapPinOff, Car, Cross, Utensils,
  Navigation, Compass, ShieldAlert, Info, Shield, HeartPulse
} from 'lucide-react';
import { useLocation } from '@/hooks/use-location';
import { LanguageToggle } from '@/components/shared/language-toggle';
import { cn } from '@/lib/utils';

/* ─── Category definition ─────────────────────────────────── */
const CATEGORY_TILES = [
  {
    href: '/navigate',
    icon: Navigation,
    labelEn: 'Live Map',
    labelTe: 'లైవ్ మ్యాప్',
    captionEn: 'Interactive map & navigation',
    captionTe: 'ఇంటరాక్టివ్ మ్యాప్ & రూట్',
    tileStyle: { background: 'linear-gradient(145deg, #9B1C31 0%, #C42444 100%)' },
  },
  {
    href: '/parking',
    icon: Car,
    labelEn: 'Parking',
    labelTe: 'పార్కింగ్',
    captionEn: 'Free parking available',
    captionTe: 'ఉచిత పార్కింగ్ స్థలాలు',
    tileStyle: { background: 'linear-gradient(145deg, #D97706 0%, #F59E0B 100%)' },
  },
  {
    href: '/medical',
    icon: Cross,
    labelEn: 'Medical',
    labelTe: 'వైద్యం',
    captionEn: 'First aid & medical camps',
    captionTe: 'ప్రథమ చికిత్స కేంద్రాలు',
    tileStyle: { background: 'linear-gradient(145deg, #16803C 0%, #15803D 100%)' },
  },
  {
    href: '/food',
    icon: Utensils,
    labelEn: 'Annadanam',
    labelTe: 'అన్నదానం',
    captionEn: 'Free prasad & meals',
    captionTe: 'ఉచిత ప్రసాదం & భోజనం',
    tileStyle: { background: 'linear-gradient(145deg, #C76A00 0%, #EA580C 100%)' },
  },
] as const;

/* ─── Gold ornamental divider ─────────────────────────────── */
function GoldDivider() {
  return (
    <div className="flex items-center gap-3 my-1" aria-hidden="true">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,160,23,0.4))' }} />
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-gold)', opacity: 0.5 }} />
      <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(212,160,23,0.4), transparent)' }} />
    </div>
  );
}

/* ─── Section heading ─────────────────────────────────────── */
function SectionHead({ en, te, locale }: { en: string; te: string; locale: string }) {
  return (
    <h2
      className="text-base sm:text-lg font-bold"
      style={{
        fontFamily: locale === 'te' ? 'var(--font-telugu)' : 'var(--font-sans)',
        color: 'var(--color-text)',
      }}
    >
      {locale === 'te' ? te : en}
    </h2>
  );
}

/* ─── Main page ───────────────────────────────────────────── */
export default function HomePage() {
  const t = useTranslations('home');
  const locale = useLocale();

  const { location, permissionState, requestLocation } = useLocation({ autoRequest: false });
  const isTE = locale === 'te';

  return (
    <div className="w-full">

      {/* ═══════════════════════════════════════════════════════
          HERO HEADER — Temple crimson with Cinzel branding
          ═══════════════════════════════════════════════════════ */}
      <section className="devotional-header text-white relative shadow-lg" aria-label="Temple navigation hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 sm:pt-12 sm:pb-14 relative z-10">

          {/* Mobile language toggle */}
          <div className="md:hidden flex justify-end mb-5">
            <LanguageToggle currentLocale={locale} />
          </div>

          <div className="max-w-3xl">
            {/* Temple name */}
            <div className="flex items-center gap-2 mb-3">
              {/* Diya icon */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(242,201,76,0.2)', border: '1px solid rgba(242,201,76,0.35)' }}
                aria-hidden="true"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C10.5 2 9.5 3 9.5 4.5C9.5 6 10.5 7 12 7C13.5 7 14.5 6 14.5 4.5C14.5 3 13.5 2 12 2Z" fill="#F2C94C"/>
                  <path d="M12 8C9 8 7 10 7 13C7 16 9 18 12 22C15 18 17 16 17 13C17 10 15 8 12 8Z" fill="#FBBF24"/>
                  <circle cx="12" cy="13" r="2.5" fill="#FFF8E7" opacity="0.9"/>
                </svg>
              </div>
              <span
                className="text-xs sm:text-sm font-medium tracking-wider uppercase"
                style={{
                  fontFamily: isTE ? 'var(--font-telugu)' : "'Forum', Georgia, serif",
                  color: 'rgba(242,201,76,0.9)',
                }}
              >
                {isTE ? 'శ్రీ కనక దుర్గమ్మ దేవస్థానం • ఇంద్రకీలాద్రి' : 'Sri Kanaka Durga Temple • Indrakeeladri, Vijayawada'}
              </span>
            </div>

            {/* Main hero title */}
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight"
              style={{
                fontFamily: isTE
                  ? 'var(--font-telugu)'
                  : "'Cinzel', Georgia, serif",
                fontWeight: 700,
                letterSpacing: isTE ? '0' : '0.02em',
                lineHeight: isTE ? '1.3' : '1.1',
              }}
            >
              {isTE ? 'దసరా మహోత్సవాల స్మార్ట్ నావిగేషన్' : 'Dasara Smart Navigation'}
            </h1>

            {/* Sub-heading */}
            <p
              className="mt-2 text-sm sm:text-base max-w-2xl leading-relaxed"
              style={{
                fontFamily: isTE
                  ? 'var(--font-telugu)'
                  : "'Cormorant Garamond', Georgia, serif",
                fontWeight: 500,
                color: 'rgba(255,255,255,0.85)',
                fontSize: isTE ? '0.875rem' : '1.1rem',
              }}
            >
              {isTE
                ? 'ఉచిత పార్కింగ్, అన్నదానం, వైద్య కేంద్రాలు మరియు ఘాట్ రోడ్ రూట్ సమాచారం క్షణాల్లో తెలుసుకోండి.'
                : 'Real-time pilgrim guidance for free parking, Annadanam meals, medical camps, and Ghat road navigation.'}
            </p>

            {/* Gold ornamental rule */}
            <div className="mt-4 mb-5 w-24 h-0.5 opacity-50" style={{ background: 'linear-gradient(90deg, var(--color-gold), transparent)' }} aria-hidden="true" />

            {/* Location + Map CTA row */}
            <div className="flex flex-wrap items-center gap-3">
              {permissionState === 'granted' && location ? (
                <div className="flex items-center gap-2 rounded-full px-4 py-1.5 backdrop-blur-sm"
                  style={{ background: 'rgba(22,128,60,0.25)', border: '1px solid rgba(74,222,128,0.3)' }}>
                  <MapPin size={13} className="text-emerald-300 animate-bounce" aria-hidden />
                  <span className="text-white text-xs font-semibold">{t('locationGranted')}</span>
                  <span className="text-emerald-300 text-xs font-mono">±{Math.round(location.accuracy)}m</span>
                </div>
              ) : permissionState === 'denied' ? (
                <div className="flex items-center gap-2 rounded-full px-4 py-1.5 backdrop-blur-sm"
                  style={{ background: 'rgba(198,40,40,0.25)', border: '1px solid rgba(248,113,113,0.3)' }}>
                  <MapPinOff size={13} className="text-red-300" aria-hidden />
                  <span className="text-white text-xs font-medium">{t('locationDenied')}</span>
                </div>
              ) : (
                <button
                  onClick={requestLocation}
                  className="flex items-center gap-2 rounded-full px-4 py-1.5 transition-all text-xs font-semibold cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
                  aria-label={t('enableLocation')}
                >
                  <Navigation size={13} style={{ color: 'var(--color-gold-light)' }} aria-hidden />
                  <span>{t('locationPrompt')}</span>
                </button>
              )}

              <Link
                href="/navigate"
                className="hidden sm:inline-flex items-center gap-2 font-bold px-4 py-1.5 rounded-full text-xs shadow-md transition-all hover:scale-105"
                style={{ background: 'var(--color-gold)', color: 'var(--color-charcoal)' }}
              >
                <Compass size={13} aria-hidden />
                <span>{isTE ? 'లైవ్ మ్యాప్ చూడండి' : 'Open Live Map'}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">

        {/* ── 4 PRIMARY FACILITY TILES ─────────────────────── */}
        <section aria-label="Temple facilities and navigation">
          <div className="flex items-center justify-between mb-5">
            <div>
              <SectionHead
                en="Temple Facilities"
                te="ప్రధాన సేవలు"
                locale={locale}
              />
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
                {isTE ? 'విభాగం ఎంచుకోండి' : 'Select a category to navigate'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {CATEGORY_TILES.map(({ href, icon: Icon, labelEn, labelTe, captionEn, captionTe, tileStyle }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center no-underline transition-all duration-200 border border-black/5 shadow-md text-white hover:-translate-y-1 hover:shadow-xl relative overflow-hidden'
                )}
                style={tileStyle}
                aria-label={`${isTE ? labelTe : labelEn} — ${isTE ? captionTe : captionEn}`}
              >
                {/* Icon container */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200 bg-white/20 text-white">
                  <Icon size={26} aria-hidden strokeWidth={2} />
                </div>

                {/* Label */}
                <span
                  className="font-bold text-sm sm:text-base leading-tight text-white"
                  style={{ fontFamily: isTE ? 'var(--font-telugu)' : 'var(--font-sans)' }}
                >
                  {isTE ? labelTe : labelEn}
                </span>

                {/* Caption */}
                <span
                  className="text-[11px] sm:text-xs mt-1 leading-snug line-clamp-2 text-white/80"
                  style={{ fontFamily: isTE ? 'var(--font-telugu)' : 'var(--font-sans)' }}
                >
                  {isTE ? captionTe : captionEn}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Gold ornamental divider between major sections */}
        <GoldDivider />

        {/* ── TWO COLUMN CONTENT SECTION ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">

          {/* Left 2 columns */}
          <div className="lg:col-span-2 space-y-6">

            {/* Navigation CTA Card */}
            <section
              className="rounded-2xl p-6 sm:p-8"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
              aria-label="Navigation guide"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}
                >
                  <Compass size={24} aria-hidden />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
                    {isTE ? 'స్మార్ట్ మ్యాప్ నావిగేషన్' : 'Smart Map Navigation'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {isTE ? 'ఇంద్రకీలాద్రి కొండపై అన్ని ప్రాంతాలకు సులభమైన దారి' : 'GPS-enabled turn-by-turn guidance on Indrakeeladri Hill'}
                  </p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
                {isTE
                  ? 'మీ ప్రస్తుత లొకేషన్ ఆధారంగా ఘాట్ రోడ్ ప్రవేశాలు, ఉచిత వాహన పార్కింగ్ ప్రాంతాలు, అన్నదానం కాంప్లెక్స్ మరియు వైద్య శిబిరాలకు నేరుగా నావిగేట్ అవ్వండి.'
                  : 'Get real-time directions to parking lots, Annadanam halls, medical posts, and key sanctum points around the temple with GPS positioning.'}
              </p>
              <Link
                href="/navigate"
                className="btn btn-primary text-sm font-bold py-3 px-6 inline-flex items-center gap-2"
                aria-label="Open navigation map"
              >
                <Navigation size={18} aria-hidden />
                <span>{isTE ? 'లైవ్ నావిగేషన్ ప్రారంభించండి' : 'Launch Live Navigation'}</span>
              </Link>
            </section>

            {/* Dasara Advisory Card */}
            <section
              className="rounded-2xl p-5 sm:p-6"
              style={{ background: 'linear-gradient(135deg, var(--color-gold-subtle), #FFF8ED)', border: '1px solid rgba(212,160,23,0.25)' }}
              aria-label="Dasara pilgrim guidelines"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(212,160,23,0.15)', color: 'var(--color-gold-dark)' }}
                >
                  <Info size={16} aria-hidden />
                </div>
                <h3
                  className="font-bold text-sm sm:text-base leading-snug"
                  style={{ color: 'var(--color-charcoal)', fontFamily: isTE ? 'var(--font-telugu)' : 'var(--font-sans)' }}
                >
                  {isTE ? 'దసరా భక్తుల మార్గదర్శకాలు' : 'Dasara Pilgrim Guidelines & Traffic Advisory'}
                </h3>
              </div>
              <ul className="text-xs sm:text-sm space-y-2 ml-4 list-disc mt-2 leading-relaxed"
                style={{ color: 'rgba(43,33,24,0.8)', fontFamily: isTE ? 'var(--font-telugu)' : 'var(--font-sans)' }}>
                <li>
                  {isTE
                    ? 'భవాని ఘాట్ వద్ద నిరంతర అన్నదాన వితరణ కేంద్రాలు మరియు వైద్య శిబిరాలు ఏర్పాటు చేయబడ్డాయి.'
                    : 'Bhavani Ghat Annadanam meal distribution counters and 24×7 medical first-aid camps are active.'}
                </li>
                <li>
                  {isTE
                    ? 'వాహనదారులు నియమించబడిన పార్కింగ్ స్థలాలను మాత్రమే ఉపయోగించవలసిందిగా కోరడమైనది.'
                    : 'Pilgrims are requested to park vehicles only in authorized temple parking lots and walk or follow pedestrian signage.'}
                </li>
              </ul>
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Emergency Hotline */}
            <div
              className="rounded-2xl p-5 sm:p-6"
              style={{ background: 'linear-gradient(135deg, #FFF5F5 0%, #FEF2F2 100%)', border: '1px solid #FECACA' }}
              role="complementary"
              aria-label="Emergency hotlines"
            >
              <div className="flex items-center gap-2.5 mb-3" style={{ color: 'var(--color-danger)' }}>
                <ShieldAlert size={20} aria-hidden />
                <h3 className="font-bold text-sm sm:text-base" style={{ fontFamily: 'var(--font-sans)' }}>
                  {isTE ? 'తక్షణ సహాయం' : 'Emergency Hotlines'}
                </h3>
              </div>
              <p className="text-xs mb-4 leading-relaxed" style={{ color: '#7F1D1D' }}>
                {isTE
                  ? 'ఏదైనా అత్యవసర పరిస్థితిలో వెంటనే ఈ నంబర్లను సంప్రదించండి:'
                  : 'One-tap access to emergency services for medical and police assistance:'}
              </p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <a
                  href="tel:100"
                  className="rounded-xl p-3 text-center transition-colors text-decoration-none"
                  style={{ background: 'white', border: '1px solid #FECACA' }}
                  aria-label="Call Police 100"
                >
                  <Shield size={18} className="mx-auto mb-1 text-blue-700" aria-hidden />
                  <span className="text-xs font-bold block" style={{ color: '#7F1D1D' }}>Police</span>
                  <span className="text-sm font-black" style={{ color: 'var(--color-danger)' }}>100</span>
                </a>
                <a
                  href="tel:108"
                  className="rounded-xl p-3 text-center transition-colors text-decoration-none"
                  style={{ background: 'white', border: '1px solid #FECACA' }}
                  aria-label="Call Ambulance 108"
                >
                  <HeartPulse size={18} className="mx-auto mb-1 text-red-600" aria-hidden />
                  <span className="text-xs font-bold block" style={{ color: '#7F1D1D' }}>Ambulance</span>
                  <span className="text-sm font-black" style={{ color: 'var(--color-danger)' }}>108</span>
                </a>
              </div>
              <Link
                href="/medical"
                className="block text-center text-xs font-bold transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-danger)' }}
              >
                {isTE ? 'వైద్య సహాయ కేంద్రాలు చూడండి →' : 'View Medical Aid Centers →'}
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
