'use client';

import { useTranslations, useLocale } from 'next-intl';
import {
  AlertTriangle, Phone, Navigation, Shield, HeartPulse, Flame, Users2, ShieldAlert, Siren
} from 'lucide-react';
import { useEmergencyPoints } from '@/hooks/use-data';
import { LoadingSpinner, DemoBanner } from '@/components/shared/status-components';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { EmergencyPoint } from '@/types';

const EMERGENCY_CONTACTS = [
  {
    label: 'Police Control',
    label_te: 'పోలీస్ కంట్రోల్',
    number: '100',
    icon: Shield,
    color: 'bg-blue-600 hover:bg-blue-700',
    desc: 'Law, order & security',
  },
  {
    label: 'Ambulance & Medical',
    label_te: 'అంబులెన్స్ & వైద్యం',
    number: '108',
    icon: HeartPulse,
    color: 'bg-red-600 hover:bg-red-700',
    desc: 'Paramedics & trauma',
  },
  {
    label: 'Fire Services',
    label_te: 'అగ్నిమాపక దళం',
    number: '101',
    icon: Flame,
    color: 'bg-amber-600 hover:bg-amber-700',
    desc: 'Fire & rescue squad',
  },
  {
    label: 'Women Helpline',
    label_te: 'మహిళా హెల్ప్‌లైన్',
    number: '1091',
    icon: Users2,
    color: 'bg-purple-600 hover:bg-purple-700',
    desc: 'Women & child safety',
  },
] as const;

export default function EmergencyPage() {
  const t = useTranslations('emergency');
  const locale = useLocale();
  const { data: allPoints, isLoading } = useEmergencyPoints();
  const nearestPoints = allPoints?.slice(0, 6) ?? [];

  return (
    <div className="w-full">
      <header className="page-header" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}>
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <AlertTriangle size={24} aria-hidden />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t('title')}</h1>
              <p className="text-white/80 text-xs sm:text-sm">
                {locale === 'te' ? 'అత్యవసర సహాయం, పోలీస్ మరియు వైద్య సహాయ కేంద్రాలు' : 'Emergency Assistance & Immediate Police/Medical Response'}
              </p>
            </div>
          </div>
          <a
            href="tel:112"
            className="hidden sm:inline-flex items-center gap-2 bg-white hover:bg-red-50 text-red-900 font-bold px-4 py-2 rounded-xl text-xs shadow transition-all"
          >
            <Phone size={14} className="text-red-600" />
            <span>{locale === 'te' ? 'నేషనల్ ఎమర్జెన్సీ 112' : 'National SOS 112'}</span>
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <DemoBanner />

        {/* Priority 112 Alert */}
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
              <Siren size={26} aria-hidden />
            </div>
            <div>
              <h2 className="font-bold text-red-900 text-base sm:text-lg">
                {locale === 'te' ? 'తక్షణ అత్యవసర సహాయం కోసం (All-in-One)' : 'Universal Emergency Helpline: Dial 112'}
              </h2>
              <p className="text-xs sm:text-sm text-red-700 mt-0.5">
                {locale === 'te'
                  ? 'పోలీస్, ఫైర్ లేదా అంబులెన్స్ సేవలకు ఒకే నంబర్ 112 కు కాల్ చేయండి.'
                  : 'For immediate coordinated dispatch of police, ambulance, or fire units, call 112.'}
              </p>
            </div>
          </div>
          <a
            href="tel:112"
            className="bg-red-600 hover:bg-red-700 text-white font-black px-5 py-2.5 rounded-xl text-sm shadow-md transition-all whitespace-nowrap"
          >
            Call 112
          </a>
        </div>

        {/* National emergency numbers: 4 Cards on Desktop */}
        <section aria-label="Emergency contact numbers">
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">
            {locale === 'te' ? 'తక్షణ ఫోన్ నంబర్లు' : 'Direct Emergency Service Hotlines'}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {EMERGENCY_CONTACTS.map((contact) => {
              const ContactIcon = contact.icon;
              return (
                <a
                  key={contact.number}
                  href={`tel:${contact.number}`}
                  className={cn(
                    'text-white rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-h-27.5 sm:min-h-32.5 shadow-md hover:-translate-y-1 hover:shadow-xl transition-all text-decoration-none group',
                    contact.color
                  )}
                  aria-label={`Call ${contact.label} ${contact.number}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ContactIcon size={22} aria-hidden />
                    </div>
                    <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight">{contact.number}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-sm font-bold block leading-tight">
                      {locale === 'te' ? contact.label_te : contact.label}
                    </span>
                    <span className="text-[11px] text-white/80 hidden sm:block mt-0.5">
                      {contact.desc}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* Nearest help on ground: Responsive Grid */}
        <section aria-label="Nearest help on ground">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-(--color-text) flex items-center gap-2">
              <ShieldAlert size={20} className="text-red-600" />
              <span>{t('nearestHelp')}</span>
            </h2>
            <span className="text-xs text-text-muted">
              {locale === 'te' ? 'ఆలయ పరిసరాల్లో సహాయ కేంద్రాలు' : 'On-ground aid posts & police help points'}
            </span>
          </div>

          {isLoading && (
            <div className="flex justify-center p-12">
              <LoadingSpinner size="lg" className="text-red-600" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {nearestPoints.map((point) => (
              <NearestHelpCard key={point.id} point={point} locale={locale} t={t} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function getEmergencyIcon(type: string) {
  switch (type) {
    case 'POLICE':    return Shield;
    case 'FIRE':      return Flame;
    case 'AMBULANCE': return HeartPulse;
    default:          return ShieldAlert;
  }
}

function NearestHelpCard({ point, locale, t }: { point: EmergencyPoint; locale: string; t: ReturnType<typeof useTranslations> }) {
  const HelpIcon = getEmergencyIcon(point.emergency_type);

  return (
    <div className="card p-5 hover:shadow-md transition-shadow flex flex-col justify-between h-full">
      <div>
        <div className="flex items-start gap-3.5 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0 shadow-inner">
            <HelpIcon size={22} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-(--color-text) leading-snug">
              {locale === 'te' ? point.name_te : point.name}
            </h3>
            <p className="text-xs text-red-700 font-semibold mt-0.5">
              {['POLICE', 'MEDICAL', 'FIRST_AID', 'AMBULANCE', 'FIRE', 'HELP_DESK', 'SOS_BOOTH'].includes(point.emergency_type)
                ? t(`emergencyTypes.${point.emergency_type}` as 'emergencyTypes.POLICE')
                : (point.emergency_type || 'Help Desk')}
            </p>
            {point.location?.address && (
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                {point.location.address}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2.5 pt-3 border-t border-border mt-2">
        {point.contact_phone && (
          <a
            href={`tel:${point.contact_phone}`}
            className="btn btn-outline text-xs font-bold flex-1 py-2 flex items-center justify-center gap-1.5"
            aria-label={`Call ${point.name}`}
          >
            <Phone size={15} aria-hidden />
            <span>{t('call')}</span>
          </a>
        )}
        <Link
          href={`/navigate?location=${point.location_id}`}
          className="btn btn-primary text-xs font-bold flex-1 py-2 flex items-center justify-center gap-1.5"
          aria-label={`Navigate to ${point.name}`}
        >
          <Navigation size={15} aria-hidden />
          <span>{t('navigate')}</span>
        </Link>
      </div>
    </div>
  );
}
