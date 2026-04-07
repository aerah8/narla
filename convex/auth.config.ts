// This file configures Clerk as the auth provider for Convex.
// The domain must match the "Issuer" field in your Clerk JWT template.
// To set up:
// 1. Go to Clerk Dashboard → JWT Templates → New template → Convex
// 2. Copy the "Issuer" URL (e.g., https://your-app.clerk.accounts.dev)
// 3. Replace the domain below with that URL

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN ?? "",
      applicationID: "convex",
    },
  ],
};
