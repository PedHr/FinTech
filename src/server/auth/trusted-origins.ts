const VERCEL_HOST_SUFFIX = ".vercel.app";

function vercelOrigin(host: string | undefined) {
  const normalizedHost = host?.trim().toLowerCase();
  if (!normalizedHost || normalizedHost.includes("://") || normalizedHost.includes("/")) return null;

  try {
    const url = new URL(`https://${normalizedHost}`);
    if (url.port || !url.hostname.endsWith(VERCEL_HOST_SUFFIX)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getTrustedAuthOrigins(appUrl: string) {
  const origins = new Set([new URL(appUrl).origin]);
  const vercelHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ];

  for (const host of vercelHosts) {
    const origin = vercelOrigin(host);
    if (origin) origins.add(origin);
  }

  return [...origins];
}
