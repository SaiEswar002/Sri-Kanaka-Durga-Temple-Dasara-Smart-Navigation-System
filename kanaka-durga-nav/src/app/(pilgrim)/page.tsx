'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import {
  MapPin, MapPinOff, Eye, Car, Plus, Utensils,
  Bus, AlertTriangle, Bell, Navigation, ArrowRight,
  Compass, ShieldAlert, PhoneCall, Clock, Globe2, Info, Shield, HeartPulse
} from 'lucide-react';
import { useLocation } from '@/hooks/use-location';
import { useAnnouncements } from '@/hooks/use-data';
import { LanguageToggle } from '@/components/shared/language-toggle';
import { PRIORITY_CONFIG, cn } from '@/lib/utils';
import type { AnnouncementPriority } from '@/types';

const CATEGORY_TILES = [
  {
    href: '/darshan',
    icon: Eye,
    labelKey: 'darshan',
    labelTe: 'దర్శనం',
    captionKey: 'darshancaption',
    captionTe: 'క్యూ లైన్ సమాచారం',
    gradient: 'linear-gradient(135deg, #9b1b30 0%, #c42444 100%)',
    textColor: 'text-white',
    isEmergency: false,
  },
  {
    href: '/parking',
    icon: Car,
    labelKey: 'parking',
    labelTe: 'పార్కింగ్',
    captionKey: 'parkingcaption',
    captionTe: 'ఉచిత పార్కింగ్ స్థలాలు',
    gradient: 'linear-gradient(135deg, #d4851a 0%, #f0a030 100%)',
    textColor: 'text-white',
    isEmergency: false,
  },
  {
    href: '/medical',
    icon: Plus,
    labelKey: 'medical',
    labelTe: 'వైద్యం',
    captionKey: 'medicalcaption',
    captionTe: 'ప్రథమ చికిత్స కేంద్రాలు',
    gradient: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
    textColor: 'text-white',
    isEmergency: false,
  },
  {
    href: '/food',
    icon: Utensils,
    labelKey: 'food',
    labelTe: 'అన్నదానం',
    captionKey: 'foodcaption',
    captionTe: 'ఉచిత ప్రసాదం & భోజనం',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
    textColor: 'text-white',
    isEmergency: false,
  },
  {
    href: '/bus',
    icon: Bus,
    labelKey: 'bus',
    labelTe: 'బస్సు',
    captionKey: 'buscaption',
    captionTe: 'ఉచిత దేవస్థానం షటిల్',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    textColor: 'text-white',
    isEmergency: false,
  },
  {
    href: '/emergency',
    icon: AlertTriangle,
    labelKey: 'emergency',
    labelTe: 'ఎమర్జెన్సీ',
    captionKey: 'emergencycaption',
    captionTe: 'తక్షణ సహాయం (100 / 108)',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    textColor: 'text-white',
    isEmergency: true,
  },
] as const;

export default function HomePage() {
  const t = useTranslations('home');
  const tCat = useTranslations('home.categories');
  const locale = useLocale();

  const { location, permissionState, requestLocation } = useLocation({ autoRequest: false });
  const { data: announcements, isLoading: announcementsLoading } = useAnnouncements();

  const urgentAnnouncement = announcements?.find((a) => a.priority === 'URGENT');
  const regularAnnouncements = announcements?.filter((a) => a.priority !== 'URGENT').slice(0, 4) ?? [];

  return (
    <div className="w-full">
      {/* ===== DEVOTIONAL HERO HEADER ===== */}
      <section className="devotional-header text-white relative shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 sm:pt-12 sm:pb-14">
          {/* Mobile Language Toggle */}
          <div className="md:hidden flex justify-end mb-4">
            <LanguageToggle currentLocale={locale} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Main branding */}
            <div className="md:col-span-8">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-amber-400/30 border border-amber-300/40 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2C10.5 2 9.5 3 9.5 4.5C9.5 6 10.5 7 12 7C13.5 7 14.5 6 14.5 4.5C14.5 3 13.5 2 12 2Z" fill="#fbbf24"/>
                    <path d="M12 8C9 8 7 10 7 13C7 16 9 18 12 22C15 18 17 16 17 13C17 10 15 8 12 8Z" fill="#fde68a"/>
                    <circle cx="12" cy="13" r="2.5" fill="#fffbeb" opacity="0.95"/>
                  </svg>
                </div>
                <span className="text-amber-200 text-xs sm:text-sm font-semibold tracking-wider uppercase">
                  {locale === 'te' ? 'శ్రీ కనక దుర్గమ్మ దేవస్థానం • ఇంద్రకీలాద్రి' : 'Sri Kanaka Durga Temple • Indrakeeladri'}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                {locale === 'te' ? 'దసరా మహోత్సవాల స్మార్ట్ నావిగేషన్' : 'Dasara Smart Navigation System'}
              </h1>
              <p className="text-white/80 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                {locale === 'te'
                  ? 'క్యూ లైన్లు, ఉచిత పార్కింగ్, అన్నదానం, వైద్య కేంద్రాలు మరియు ఘాట్ రోడ్ రూట్ సమాచారం క్షణాల్లో తెలుసుకోండి.'
                  : 'Real-time pilgrim guidance for Darshan queues, free parking availability, Annadanam meals, medical centers, and Ghat road navigation.'}
              </p>

              {/* Location acquisition bar */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {permissionState === 'granted' && location ? (
                  <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-400/40 rounded-full px-4 py-1.5 backdrop-blur-sm">
                    <MapPin size={14} className="text-emerald-300 animate-bounce" aria-hidden />
                    <span className="text-white text-xs font-semibold">
                      {t('locationGranted')}
                    </span>
                    <span className="text-emerald-300 text-xs font-mono">
                      ±{Math.round(location.accuracy)}m
                    </span>
                  </div>
                ) : permissionState === 'denied' ? (
                  <div className="flex items-center gap-2 bg-red-950/50 border border-red-400/40 rounded-full px-4 py-1.5 backdrop-blur-sm">
                    <MapPinOff size={14} className="text-red-300" aria-hidden />
                    <span className="text-white text-xs font-medium">{t('locationDenied')}</span>
                  </div>
                ) : (
                  <button
                    onClick={requestLocation}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 active:scale-95 border border-white/20 rounded-full px-4 py-1.5 transition-all text-xs font-semibold shadow-sm"
                    aria-label={t('enableLocation')}
                  >
                    <Navigation size={14} className="text-amber-200" aria-hidden />
                    <span>{t('locationPrompt')}</span>
                  </button>
                )}

                <Link
                  href="/navigate"
                  className="hidden sm:inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold px-4 py-1.5 rounded-full text-xs shadow-md transition-all hover:scale-105"
                >
                  <Compass size={14} aria-hidden />
                  <span>{locale === 'te' ? 'లైవ్ మ్యాప్ చూడండి' : 'Open Live Map'}</span>
                </Link>
              </div>
            </div>

            {/* Quick Fast Facts / Stats on Laptop */}
            <div className="hidden md:block md:col-span-4">
              <div className="bg-black/25 backdrop-blur-md rounded-2xl p-5 border border-white/15 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs text-amber-200 font-bold uppercase tracking-wider">
                    {locale === 'te' ? 'నేటి దర్శన సమాచారం' : 'Today’s Darshan Info'}
                  </span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/10 rounded-xl p-2.5">
                    <span className="text-white/60 block text-[10px]">{locale === 'te' ? 'సాధారణ దర్శనం' : 'Sarva Darshan'}</span>
                    <span className="text-white font-bold text-sm">~45 - 60 min</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5">
                    <span className="text-white/60 block text-[10px]">{locale === 'te' ? 'ప్రత్యేక దర్శనం' : 'Special Queue'}</span>
                    <span className="text-white font-bold text-sm">~20 - 30 min</span>
                  </div>
                </div>
                <Link
                  href="/darshan"
                  className="flex items-center justify-between text-xs text-amber-300 hover:text-white font-semibold pt-1 transition-colors"
                >
                  <span>{locale === 'te' ? 'అన్ని క్యూ లైన్లు చూడండి' : 'View all queue lines'}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== URGENT ANNOUNCEMENT BANNER ===== */}
      {urgentAnnouncement && (
        <div className="announcement-urgent px-4 py-3 sm:px-8 sm:py-4 flex items-center justify-center gap-3 shadow-inner">
          <Bell size={18} className="flex-shrink-0 animate-bounce" aria-hidden />
          <div className="text-center sm:text-left">
            <span className="font-bold text-sm sm:text-base mr-2">
              {locale === 'te' ? urgentAnnouncement.title_te : urgentAnnouncement.title}:
            </span>
            <span className="text-white/95 text-xs sm:text-sm">
              {locale === 'te' ? urgentAnnouncement.message_te : urgentAnnouncement.message}
            </span>
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT CONTAINER ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* ===== 6 CATEGORY TILES (RESPONSIVE GRID) ===== */}
        <section aria-label="Navigation categories">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text)] flex items-center gap-2">
              <Globe2 size={22} className="text-[var(--color-primary)]" aria-hidden />
              <span>{locale === 'te' ? 'ప్రధాన సేవలు & నావిగేషన్' : 'Temple Facilities & Navigation'}</span>
            </h2>
            <span className="text-xs text-[var(--color-text-muted)] font-medium">
              {locale === 'te' ? 'విభాగం ఎంచుకోండి' : 'Select a category'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
            {CATEGORY_TILES.map(({ href, icon: Icon, labelKey, labelTe, captionKey, captionTe, gradient, isEmergency }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center text-decoration-none transition-all duration-200 border border-black/5 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden',
                  isEmergency
                    ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-sm'
                    : 'shadow-md text-white'
                )}
                style={!isEmergency ? { background: gradient } : undefined}
                aria-label={`${tCat(labelKey)} - ${tCat(captionKey)}`}
              >
                <div
                  className={cn(
                    'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform duration-200',
                    isEmergency ? 'bg-red-500/10 text-red-600' : 'bg-white/20 text-white'
                  )}
                >
                  <Icon size={28} aria-hidden strokeWidth={2.2} />
                </div>
                <span
                  className={cn(
                    'font-black text-sm sm:text-base leading-tight tracking-tight',
                    isEmergency ? 'text-red-700' : 'text-white'
                  )}
                >
                  {locale === 'te' ? labelTe : tCat(labelKey)}
                </span>
                <span
                  className={cn(
                    'text-[11px] sm:text-xs mt-1 leading-snug line-clamp-2',
                    isEmergency ? 'text-red-500 font-medium' : 'text-white/80'
                  )}
                >
                  {locale === 'te' ? captionTe : tCat(captionKey)}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ===== TWO-COLUMN / THREE-COLUMN LAPTOP DASHBOARD SECTION ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          {/* LEFT 2 COLUMNS: LIVE ANNOUNCEMENTS & CROWD STATUS */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Announcements Card */}
            <section className="bg-white rounded-2xl border border-[var(--color-border)] p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-[var(--color-primary)] flex items-center justify-center">
                    <Bell size={18} aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--color-text)]">
                      {t('announcements')}
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {locale === 'te' ? 'అధికారిక ఆలయ ప్రకటనలు' : 'Official Temple Control Room Broadcasts'}
                    </p>
                  </div>
                </div>
                {announcements && announcements.length > 4 && (
                  <Link
                    href="/announcements"
                    className="text-xs text-[var(--color-primary)] hover:underline font-bold flex items-center gap-1"
                  >
                    <span>{locale === 'te' ? 'అన్నీ చూడండి' : 'View All'}</span>
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>

              {announcementsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : regularAnnouncements.length === 0 ? (
                <div className="text-center py-6 text-[var(--color-text-muted)] text-sm">
                  {locale === 'te' ? 'ప్రస్తుతం కొత్త ప్రకటనలు లేవు.' : 'No active announcements at this moment.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {regularAnnouncements.map((ann) => {
                    const pc = PRIORITY_CONFIG[ann.priority as AnnouncementPriority];
                    return (
                      <div
                        key={ann.id}
                        className="rounded-xl p-3.5 bg-gray-50/70 border border-gray-100 hover:bg-amber-50/40 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className={cn('badge text-[11px] font-bold mt-0.5', pc.color)}>
                            {ann.priority}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-gray-900 leading-snug">
                              {locale === 'te' ? ann.title_te : ann.title}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                              {locale === 'te' ? ann.message_te : ann.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Ghat Road & Festival Advisory */}
            <section className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 rounded-2xl border border-amber-200/80 p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-200/60 flex items-center justify-center text-amber-900 flex-shrink-0">
                  <Info size={16} aria-hidden />
                </div>
                <h3 className="font-bold text-base text-amber-950">
                  {locale === 'te' ? 'దసరా భక్తుల మార్గదర్శకాలు' : 'Dasara Pilgrim Guidelines & Traffic Advisory'}
                </h3>
              </div>
              <ul className="text-xs sm:text-sm text-amber-900/90 space-y-2 ml-4 list-disc mt-3 leading-relaxed">
                <li>
                  {locale === 'te'
                    ? 'భవాని ఘాట్ వద్ద ప్రత్యేక క్యూలైన్లు మరియు నిరంతర అన్నదాన వితరణ కేంద్రాలు ఏర్పాటు చేయబడ్డాయి.'
                    : 'Bhavani Ghat special entry points and 24x7 Annadanam meal distribution counters are active.'}
                </li>
                <li>
                  {locale === 'te'
                    ? 'ఘాట్ రోడ్డుపై ప్రైవేట్ వాహనాలకు అనుమతి లేదు; భక్తులు ఉచిత దేవస్థానం బస్సులను ఉపయోగించగలరు.'
                    : 'Private vehicles are restricted on Ghat Road; please use free Temple shuttle buses from designated parking lots.'}
                </li>
              </ul>
            </section>
          </div>

          {/* RIGHT COLUMN: QUICK LIVE MAP & EMERGENCY SOS WIDGET */}
          <div className="space-y-6">
            {/* Live Navigation CTA Card */}
            <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5 sm:p-6 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center">
                  <Compass size={22} className="text-[var(--color-primary)]" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--color-text)]">
                    {locale === 'te' ? 'స్మార్ట్ నావిగేషన్ మ్యాప్' : 'Smart Navigation Map'}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {locale === 'te' ? 'ఆలయ ప్రాంగణం & రూట్ మ్యాప్' : 'Turn-by-turn foot navigation'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                {locale === 'te'
                  ? 'మీ లొకేషన్ నుండి ఘాట్ రోడ్, ప్రవేశ ద్వారాలు, పార్కింగ్ మరియు అన్నదాన భవనాలకు సులభంగా చేరుకోండి.'
                  : 'Interactive GPS guidance to gates, Annadanam halls, queue sheds, and vehicle parking hubs.'}
              </p>

              <Link
                href="/navigate"
                className="btn btn-primary w-full py-3 text-sm font-bold shadow-md hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                aria-label="Open navigation map"
              >
                <Navigation size={18} aria-hidden />
                <span>{locale === 'te' ? 'మ్యాప్ నావిగేషన్ తెరవండి' : 'Open Navigation Map'}</span>
              </Link>
            </div>

            {/* Emergency Hotline Card */}
            <div className="bg-red-50/80 rounded-2xl border border-red-200 p-5 sm:p-6">
              <div className="flex items-center gap-2.5 mb-3 text-red-700">
                <ShieldAlert size={22} aria-hidden />
                <h3 className="font-bold text-base">
                  {locale === 'te' ? 'తక్షణ సహాయం & హెల్ప్‌లైన్' : 'Emergency Hotlines'}
                </h3>
              </div>
              <p className="text-xs text-red-900/80 mb-4 leading-relaxed">
                {locale === 'te'
                  ? 'ఏదైనా అత్యవసర పరిస్థితిలో వెంటనే ఈ నంబర్లను సంప్రదించండి:'
                  : 'Instant one-tap emergency services for medical and police assistance:'}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href="tel:100"
                  className="bg-white hover:bg-red-100/50 border border-red-200 rounded-xl p-2.5 text-center transition-colors text-decoration-none"
                >
                  <div className="flex justify-center mb-1">
                    <Shield size={18} className="text-blue-700" aria-hidden />
                  </div>
                  <span className="text-xs font-bold text-red-900 block">Police</span>
                  <span className="text-xs font-mono font-black text-red-600">100</span>
                </a>
                <a
                  href="tel:108"
                  className="bg-white hover:bg-red-100/50 border border-red-200 rounded-xl p-2.5 text-center transition-colors text-decoration-none"
                >
                  <div className="flex justify-center mb-1">
                    <HeartPulse size={18} className="text-red-600" aria-hidden />
                  </div>
                  <span className="text-xs font-bold text-red-900 block">Ambulance</span>
                  <span className="text-xs font-mono font-black text-red-600">108</span>
                </a>
              </div>

              <Link
                href="/emergency"
                className="mt-3 block text-center text-xs text-red-700 font-bold hover:underline"
              >
                {locale === 'te' ? 'మరిన్ని ఎమర్జెన్సీ నంబర్లు →' : 'View all emergency contacts & aid posts →'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
