import * as Sentry from "@sentry/nextjs";
import { initSentry } from "@/lib/monitoring/sentry";

initSentry();

// Client-side error boundary integration
export function captureReactError(
  error: Error,
  errorInfo: React.ErrorInfo
) {
  Sentry.withScope((scope) => {
    scope.setTag("error_type", "react_error");
    scope.setExtra("componentStack", errorInfo.componentStack);
    Sentry.captureException(error);
  });
}

export { Sentry };
