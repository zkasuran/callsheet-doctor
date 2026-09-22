import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// The signed-in user, with a flag for whether this is a guest (Anonymous) session.
// The app shell uses this to show a "save your work" prompt to guests.
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      id: userId,
      email: user.email ?? null,
      isGuest: user.isAnonymous === true,
    };
  },
});
