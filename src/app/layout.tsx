import type { Metadata, Viewport } from 'next';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { Icon } from '@/components/Icon';
import { SiteNav } from '@/components/SiteNav';
import { THEME_SCRIPT } from '@/components/ThemeToggle';
import { SOCIAL_LINKS } from '@/lib/social';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Self-hosted at build time by Next (no request to Google from visitors' browsers).
const font = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });
// Display serif for headings and trek names: the "classic" half of the look.
const serif = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  axes: ['opsz'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Ohviana — Book weekend trips', template: '%s · Ohviana' },
  description:
    'Book treks and weekend trips in the Western Ghats and beyond with verified organizers. See dates, prices and pickup points, and reserve your seats in minutes.',
  openGraph: { siteName: 'Ohviana', type: 'website', locale: 'en_IN' },
};

// Matches the header (--surface) so the browser chrome blends into it rather than banding above it.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#161a17' },
  ],
  // Lets fixed bottom bars pad themselves clear of the home indicator (env(safe-area-inset-*)).
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Smooth scrolling is for in-page anchors; this tells Next to skip it on route changes.
    // suppressHydrationWarning: THEME_SCRIPT sets data-theme before React hydrates.
    <html
      lang="en-IN"
      className={`${font.variable} ${serif.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {process.env.NEXT_PUBLIC_AUTH_MODE === 'dev' && (
          <div className="dev-banner" role="note">
            Testing mode — sign-in without password
          </div>
        )}
        <header className="site-header">
          <div className="inner">
            <Link href="/" className="brand" aria-label="Ohviana home">
              <BrandMark />
              Ohviana
            </Link>
            <SiteNav />
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="inner">
            <div className="stack" style={{ gap: 10 }}>
              <span className="brand">
                <BrandMark />
                Ohviana
              </span>
              <span>Discover adventures. Book with confidence.</span>
              <div className="social">
                {SOCIAL_LINKS.map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Ohviana on ${s.name}`}
                  >
                    <Icon name={s.icon} size={20} />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4>For organizers</h4>
              <Link href="/dashboard">List your trips</Link>
              {/* Signed out, /dashboard is the organizer pitch page. */}
              <Link href="/dashboard">Why Ohviana?</Link>
              <Link href="/login?next=/dashboard">Organizer sign in</Link>
              <Link href="/organizer-verification">Organizer verification</Link>
            </div>
            <div>
              <h4>Support</h4>
              <Link href="/contact">Contact us</Link>
            </div>
            <div>
              <h4>Company &amp; legal</h4>
              <Link href="/about">About Ohviana</Link>
              <Link href="/privacy">Privacy policy</Link>
              <Link href="/terms">Terms of service</Link>
              <Link href="/organizer-terms">Organizer terms</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Ohviana. All rights reserved.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
