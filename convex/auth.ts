import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { seedForUser } from "./seed";

// Email + password for real accounts, plus Anonymous for one-click guest access.
// Every production and errand is scoped to the signed-in user via getAuthUserId(ctx).
//
// createOrUpdateUser owns user-row creation so we can:
//   - seed a brand-new guest server-side (populated instantly, no empty flash),
//   - upgrade a guest to a real account in place when they add email + password while
//     their guest session is active, so all their productions, contacts and worked
//     errands carry over (no data loss, no duplicate account),
//   - create a normal user for a plain signup.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, type, profile }) {
      // Signing in to an account that already exists: keep it.
      if (existingUserId) return existingUserId;

      const isAnonymousSignIn = type === "credentials" && (profile as any)?.isAnonymous === true;

      // A guest currently signed in who is now signing up with email + password:
      // upgrade the existing anonymous user in place instead of making a new one.
      if (!isAnonymousSignIn) {
        const currentUserId = await getAuthUserId(ctx);
        if (currentUserId) {
          const current = await ctx.db.get(currentUserId);
          if (current && (current as any).isAnonymous === true) {
            await ctx.db.patch(currentUserId, {
              isAnonymous: undefined,
              ...(profile.email ? { email: profile.email } : {}),
            } as any);
            return currentUserId; // links the new password account to the kept user
          }
        }
      }

      // Otherwise create the user row ourselves.
      const userId = await ctx.db.insert("users", {
        ...(profile.email ? { email: profile.email } : {}),
        ...(isAnonymousSignIn ? { isAnonymous: true } : {}),
      } as any);

      // Seed a brand-new guest immediately so they land in a populated workspace.
      if (isAnonymousSignIn) {
        await seedForUser(ctx, userId);
      }
      return userId;
    },
  },
});
