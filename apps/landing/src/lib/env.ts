import { env } from '$env/dynamic/public';

/**
 * Public environment variables with fallbacks for local dev.
 * Set PUBLIC_APP_URL in your environment to point at the real app domain.
 */
export const APP_URL = env.PUBLIC_APP_URL ?? 'https://app.redactly.dev';
