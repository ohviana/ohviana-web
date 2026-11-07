import type { NextConfig } from 'next';

const PUBLIC_ENV_KEYS = [
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_AUTH_MODE',
] as const;

/**
 * On Vercel the deployment knows its own address: the production domain for production builds,
 * the branch/deployment URL for previews. Used when NEXT_PUBLIC_SITE_URL isn't configured, so
 * canonical URLs and the sitemap never point at localhost.
 */
function vercelSiteUrl(): string | undefined {
  const host =
    process.env.VERCEL_ENV === 'production'
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : (process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL);
  return host ? `https://${host}` : undefined;
}

const publicEnv: Record<(typeof PUBLIC_ENV_KEYS)[number], string> = Object.fromEntries(
  PUBLIC_ENV_KEYS.map((k) => [k, process.env[k] ?? '']),
) as Record<(typeof PUBLIC_ENV_KEYS)[number], string>;
publicEnv.NEXT_PUBLIC_SITE_URL ||= vercelSiteUrl() ?? '';

// Nothing sensible to fall back to for the API: a production site calling localhost would load
// but show no trips. Fail the deploy with the fix instead.
if (process.env.VERCEL_ENV === 'production' && !publicEnv.NEXT_PUBLIC_API_BASE_URL) {
  throw new Error(
    'NEXT_PUBLIC_API_BASE_URL is not set for Production. Add it in Vercel → Project → Settings → Environment Variables (the ohviana-apis URL) and redeploy.',
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Dev only: keep compiled pages in memory for an hour instead of ~1 minute, so returning to a
  // tab doesn't trigger a recompile.
  onDemandEntries: { maxInactiveAge: 60 * 60 * 1000, pagesBufferLength: 50 },
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@ohviana/contracts', '@ohviana/shared'],
  // Inline browser-safe values explicitly (empty when unset).
  env: publicEnv,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Origin only cross-site: direct-link tokens in ?via= never leak to e.g. map links.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
