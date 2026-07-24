// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b1b7253d6ad7e7b1aff37721378d9c1b@o4511647221284864.ingest.de.sentry.io/4511647259099216",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Use the supported dataCollection migration path from @sentry/nextjs 10.62.0.
  // This preserves the existing collection categories while disabling user-info/IP inference.
  dataCollection: {
    userInfo: false,
    cookies: true,
    httpHeaders: { request: true, response: true },
    httpBodies: ["incomingRequest", "outgoingRequest", "incomingResponse", "outgoingResponse"],
    queryParams: true,
    genAI: { inputs: true, outputs: true },
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
