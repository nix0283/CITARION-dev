import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.NODE_ENV || "development";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: SENTRY_ENVIRONMENT === "production" ? 0.1 : 1.0,
    release: process.env.npm_package_version || "1.0.0",
    
    // Server-specific settings
    integrations: [
      Sentry.httpIntegration(),
      Sentry.nodeProfilingIntegration(),
    ],
    
    // Profile sample rate
    profilesSampleRate: 0.1,
    
    // Filter sensitive data
    beforeSend(event) {
      // Filter environment variables from context
      if (event.contexts?.runtime?.env) {
        const env = event.contexts.runtime.env as Record<string, unknown>;
        const sensitiveKeys = ["API_KEY", "SECRET", "PASSWORD", "TOKEN", "PRIVATE"];
        Object.keys(env).forEach((key) => {
          if (sensitiveKeys.some((sk) => key.toUpperCase().includes(sk))) {
            env[key] = "[REDACTED]";
          }
        });
      }
      return event;
    },
  });
}

export { Sentry };
