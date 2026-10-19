declare const __APP_VERSION__: string;
declare const __BUILD_SHA__: string;
declare const __BUILD_TIME__: string;

export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const BUILD_SHA = typeof __BUILD_SHA__ === 'string' ? __BUILD_SHA__ : 'local';
export const BUILD_TIME = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : '';

/** "v0.5.0 · build 3f9c2ab · 19 Oct 2026 19:05" — the build is the GitHub commit Vercel built. */
export const BUILD_LINE = `v${APP_VERSION} · build ${BUILD_SHA}${BUILD_TIME ? ' · ' + BUILD_TIME : ''}`;
