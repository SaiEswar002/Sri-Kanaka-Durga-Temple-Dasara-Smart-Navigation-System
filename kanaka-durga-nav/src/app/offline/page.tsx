import Link from 'next/link';
import type { Metadata } from 'next';
import { WifiOff, Phone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Offline — Kanaka Durga Nav',
};

export default function OfflinePage() {
  return (
    <div className="pilgrim-shell">
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center gap-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-sm">
          <WifiOff size={40} aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-(--color-text) mb-2">
            You&apos;re Offline
          </h1>
          <p className="text-text-secondary text-sm max-w-xs mx-auto mb-1">
            No internet connection detected.
          </p>
          <p className="text-text-muted text-sm max-w-xs mx-auto">
            ఇంటర్నెట్ కనెక్షన్ అందుబాటులో లేదు.
          </p>
        </div>

        {/* Emergency numbers always available offline */}
        <div className="card p-5 w-full max-w-xs">
          <p className="font-semibold text-sm mb-3 text-(--color-text)">
            Emergency numbers (always work):
          </p>
          <div className="space-y-2">
            {[
              { label: 'Police', number: '100' },
              { label: 'Ambulance', number: '108' },
              { label: 'Fire', number: '101' },
            ].map(({ label, number }) => (
              <a
                key={number}
                href={`tel:${number}`}
                className="flex items-center justify-between p-2 rounded-lg bg-surface-alt hover:bg-primary-subtle transition-colors"
              >
                <span className="font-medium text-sm">{label}</span>
                <span className="font-bold text-primary">{number}</span>
              </a>
            ))}
          </div>
        </div>

        <Link href="/" className="btn btn-primary">
          Try Again
        </Link>
      </div>
    </div>
  );
}
