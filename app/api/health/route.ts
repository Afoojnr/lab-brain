export const dynamic = 'force-dynamic';

/**
 * A cheap "I am awake" answer for uptime pings and the host's health check. It
 * touches no database or file, so it stays fast and never fails because of data.
 */
export const GET = () => Response.json({ status: 'ok' });
