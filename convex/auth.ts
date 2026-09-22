import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";
import { seedForUser } from "./seed";

// Email + password for real accounts, plus Anonymous for one-click guest access so
// visitors (and judges) can try the app instantly. Every production and errand is scoped
// to the signed-in user via getAuthUserId(ctx), guest or not.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
  callbacks: {
    // Populate a guest the instant their anonymous user is created, server-side, so they
    // land in a fully seeded workspace with no empty flash and no client round-trip.
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      if (existingUserId) return; // only on first creation
      const user = await ctx.db.get(userId);
      if (user?.isAnonymous === true) {
        await seedForUser(ctx, userId);
      }
    },
  },
});
