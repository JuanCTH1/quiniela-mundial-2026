import * as Sentry from "@sentry/nextjs";

// Observabilidad Sentry (lado servidor + edge). No-op si NEXT_PUBLIC_SENTRY_DSN está vacío.
export async function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_APP_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

export const onRequestError = Sentry.captureRequestError;
