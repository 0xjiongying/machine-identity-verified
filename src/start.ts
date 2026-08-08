import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { isAllowedFrontendOrigin } from "./lib/security/frontend-origin.server";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    // Server logs only — never render stack traces to the client.
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests. FRONTEND_URL (when set) joins the same-origin
// allowlist — never "*".
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
  origin: (value, ctx) => isAllowedFrontendOrigin(value, ctx.request.url),
  failureResponse: new Response(
    JSON.stringify({ error: "forbidden", reason: "origin_not_allowed" }),
    {
      status: 403,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    },
  ),
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
