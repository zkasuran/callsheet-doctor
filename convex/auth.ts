import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";

// Email + password for real accounts, plus Anonymous for one-click guest access so
// visitors (and judges) can try the app instantly. Every production and errand is scoped
// to the signed-in user via getAuthUserId(ctx), guest or not.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
});
