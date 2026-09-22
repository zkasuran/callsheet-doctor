import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

// Preload a few realistic productions the first time a user signs in, so the app is
// populated instead of empty. This writes the same shapes the real flow produces
// (breakdown items, sourced contacts, errands with email threads, quotes), but directly
// in one mutation, so it is instant and never touches the model, Firecrawl or AgentMail.
//
// Idempotent: it only seeds when the user has zero productions.

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

type MsgSeed = { dir: "inbound" | "outbound"; body: string; agoMs: number };
type ErrandSeed = {
  kind: any;
  contactIdx: number;
  subject: string;
  goal: string;
  status: any;
  followupCount?: number;
  lastOutboundAgo?: number;
  lastInboundAgo?: number;
  messages: MsgSeed[];
  quote?: { amount: number; currency: string; terms?: string; status: "proposed" | "accepted" };
};

type ProductionSeed = {
  name: string;
  logline: string;
  inbox: string;
  scriptText: string;
  breakdown: { category: any; name: string; detail?: string; sceneRefs?: string[]; status: "gap" | "sourcing" | "cured" }[];
  contacts: { name: string; email: string; role?: string; company?: string; sourceUrl?: string }[];
  errands: ErrandSeed[];
};

const SEED: ProductionSeed[] = [
  {
    name: "Midnight Run",
    logline: "A getaway driver has one last night to disappear.",
    inbox: "midnight-run-demo@agentmail.to",
    scriptText:
      "INT. WAREHOUSE - NIGHT. A vintage Mustang idles under a work lamp. NADIA listens to a police scanner. EXT. HARBOUR PIER - DAWN. A cargo drone lifts a container; two divers surface.",
    breakdown: [
      { category: "location", name: "Disused harbour warehouse", detail: "Night interior, room for a car", sceneRefs: ["1"], status: "cured" },
      { category: "location", name: "Working commercial pier", detail: "Dawn exterior, water access", sceneRefs: ["2"], status: "sourcing" },
      { category: "gear", name: "Picture-car Mustang", detail: "1968, running, matte black", sceneRefs: ["1"], status: "cured" },
      { category: "crew", name: "Marine safety supervisor", detail: "For the diver scene", sceneRefs: ["2"], status: "sourcing" },
      { category: "gear", name: "Camera drone + operator", detail: "Licensed for night flight over water", sceneRefs: ["2"], status: "gap" },
      { category: "permit", name: "Night shoot permit", detail: "Warehouse district, 10pm-4am", status: "gap" },
    ],
    contacts: [
      { name: "Alan Gordon", email: "rental@alangordon.com", role: "Owner", company: "Alan Gordon Picture Cars", sourceUrl: "https://www.alangordon.com/rental" },
      { name: "LA Film Rentals", email: "rental@lafilmrentals.com", role: "Bookings", company: "LA Film Rentals", sourceUrl: "https://www.lafilmrentals.com/" },
      { name: "Harbour Board Office", email: "permits@harbourboard.example", role: "Permits desk", company: "Harbour Authority" },
      { name: "Blue Water Safety", email: "ops@bluewatersafety.example", role: "Dive supervisor", company: "Blue Water Marine Safety" },
    ],
    errands: [
      {
        kind: "gear",
        contactIdx: 0,
        subject: "Midnight Run: 1968 Mustang picture car",
        goal: "Rent a running 1968 Mustang, matte black, for a 3-night shoot",
        status: "confirmed",
        lastOutboundAgo: 2 * DAY,
        lastInboundAgo: 1 * DAY,
        messages: [
          { dir: "outbound", body: "Hi Alan, we're prepping Midnight Run and need a running 1968 Mustang in matte black for three shoot nights next month. Do you have one available, and what's the day rate? Thanks, the Midnight Run team.", agoMs: 3 * DAY },
          { dir: "inbound", body: "We have a '68 fastback, recently resprayed satin black. $1,200/day including delivery within 30 miles. Happy to hold the dates.", agoMs: 2 * DAY },
          { dir: "outbound", body: "Perfect, please hold all three nights. We'll send the insurance certificate this week.", agoMs: 1 * DAY },
        ],
        quote: { amount: 3600, currency: "USD", terms: "3 days at $1,200 incl. delivery", status: "accepted" },
      },
      {
        kind: "location",
        contactIdx: 2,
        subject: "Midnight Run: night shoot permit, harbour district",
        goal: "Secure a night filming permit for the warehouse district, 10pm to 4am",
        status: "negotiating",
        lastOutboundAgo: 1 * DAY,
        lastInboundAgo: 6 * HOUR,
        messages: [
          { dir: "outbound", body: "Hello, we'd like to apply for a night filming permit in the harbour warehouse district, 10pm to 4am across three nights. What's the process and lead time?", agoMs: 2 * DAY },
          { dir: "inbound", body: "Night permits need 10 business days and a $450 fee per night. We'll also need proof of $2M liability. Can you confirm exact dates?", agoMs: 6 * HOUR },
        ],
        quote: { amount: 1350, currency: "USD", terms: "3 nights at $450", status: "proposed" },
      },
      {
        kind: "crew",
        contactIdx: 3,
        subject: "Midnight Run: marine safety supervisor",
        goal: "Hire a certified dive safety supervisor for the pier scene",
        status: "waiting",
        followupCount: 1,
        lastOutboundAgo: 4 * DAY,
        messages: [
          { dir: "outbound", body: "Hi, we have a dawn scene with two divers surfacing beside a pier and need a certified marine safety supervisor on set. Are you available and what's your rate?", agoMs: 4 * DAY },
        ],
      },
      {
        kind: "gear",
        contactIdx: 1,
        subject: "Midnight Run: night-rated camera drone",
        goal: "Source a camera drone and operator licensed for night flight over water",
        status: "replied",
        lastOutboundAgo: 3 * DAY,
        lastInboundAgo: 2 * HOUR,
        messages: [
          { dir: "outbound", body: "We need a camera drone and operator cleared for night flight over water for one dawn scene. Do you cover that?", agoMs: 3 * DAY },
          { dir: "inbound", body: "We do, our operator holds a night + over-water waiver. Can you share the shot list so I can quote?", agoMs: 2 * HOUR },
        ],
      },
    ],
  },
  {
    name: "The Long Table",
    logline: "Three generations of a family reopen their late grandmother's restaurant.",
    inbox: "the-long-table-demo@agentmail.to",
    scriptText:
      "INT. FAMILY RESTAURANT - DAY. Dust sheets come off old tables. MARISOL reads her grandmother's recipe cards. EXT. FARMERS MARKET - MORNING. The family shops for opening night.",
    breakdown: [
      { category: "location", name: "Vintage restaurant interior", detail: "Practical kitchen, 40 covers", sceneRefs: ["1"], status: "cured" },
      { category: "catering", name: "Opening-night menu tasting", detail: "Regional dishes for 8 hero plates", status: "sourcing" },
      { category: "location", name: "Working farmers market", detail: "Morning exterior, real stalls", sceneRefs: ["2"], status: "gap" },
      { category: "cast", name: "Grandmother (flashback)", detail: "60s, warm, Spanish-speaking", status: "gap" },
      { category: "clearance", name: "Recipe card imagery", detail: "Family archive licence", status: "cured" },
    ],
    contacts: [
      { name: "Casa Vieja", email: "events@casavieja.example", role: "Manager", company: "Casa Vieja Restaurant", sourceUrl: "https://casavieja.example/private-events" },
      { name: "Market Association", email: "film@citymarket.example", role: "Film liaison", company: "City Farmers Market" },
      { name: "Elena Reyes Casting", email: "hello@elenareyescasting.example", role: "Casting director", company: "Elena Reyes Casting" },
    ],
    errands: [
      {
        kind: "location",
        contactIdx: 0,
        subject: "The Long Table: restaurant location + practical kitchen",
        goal: "Book a vintage restaurant with a working kitchen for four days",
        status: "confirmed",
        lastOutboundAgo: 5 * DAY,
        lastInboundAgo: 3 * DAY,
        messages: [
          { dir: "outbound", body: "Hi, we're shooting a warm family drama and love your dining room and open kitchen. Could we book four consecutive days, crew of 25?", agoMs: 6 * DAY },
          { dir: "inbound", body: "We'd be glad to host. $2,000/day, kitchen included, as long as we can reopen for dinner service by 6pm. Deal?", agoMs: 3 * DAY },
          { dir: "outbound", body: "That works, we'll wrap the kitchen by 5. Sending the agreement now.", agoMs: 3 * DAY },
        ],
        quote: { amount: 8000, currency: "USD", terms: "4 days at $2,000, kitchen included", status: "accepted" },
      },
      {
        kind: "cast",
        contactIdx: 2,
        subject: "The Long Table: casting a Spanish-speaking grandmother",
        goal: "Cast a warm, Spanish-speaking actor in her 60s for flashback scenes",
        status: "negotiating",
        lastOutboundAgo: 2 * DAY,
        lastInboundAgo: 5 * HOUR,
        messages: [
          { dir: "outbound", body: "We're casting a grandmother role, 60s, warm presence, fluent Spanish, three flashback days. Can you send options and rates?", agoMs: 2 * DAY },
          { dir: "inbound", body: "I have four strong candidates. Session fee is $600, plus my finder's fee. Want tapes this week?", agoMs: 5 * HOUR },
        ],
        quote: { amount: 2400, currency: "USD", terms: "3 days at $600 + session", status: "proposed" },
      },
      {
        kind: "location",
        contactIdx: 1,
        subject: "The Long Table: filming at the farmers market",
        goal: "Get permission and a slot to film at a working farmers market at dawn",
        status: "waiting",
        followupCount: 0,
        lastOutboundAgo: 1 * DAY,
        messages: [
          { dir: "outbound", body: "Hello, we'd love to film a short morning scene among your stalls before opening. Is there a film liaison we can work with on timing and fees?", agoMs: 1 * DAY },
        ],
      },
    ],
  },
  {
    name: "Signal Lost",
    logline: "A field biologist loses contact with base as a storm closes in.",
    inbox: "signal-lost-demo@agentmail.to",
    scriptText:
      "EXT. RESEARCH STATION - DUSK. RUBY tapes a cracked window as the wind rises. INT. RADIO ROOM - NIGHT. Static. A single light blinks on a dead console.",
    breakdown: [
      { category: "location", name: "Remote research station", detail: "Weathered exterior + interiors", sceneRefs: ["1"], status: "sourcing" },
      { category: "gear", name: "Period radio equipment", detail: "1980s console, practical lights", sceneRefs: ["2"], status: "gap" },
      { category: "insurance", name: "Adverse-weather cover", detail: "Coastal, storm sequence", status: "gap" },
      { category: "travel", name: "Cast + crew transport", detail: "2-hour drive, 4x4 needed", status: "gap" },
    ],
    contacts: [
      { name: "Coastal Locations", email: "book@coastallocations.example", role: "Scout", company: "Coastal Locations Co." },
      { name: "Retro AV Hire", email: "hire@retroav.example", role: "Sales", company: "Retro AV Hire" },
    ],
    errands: [
      {
        kind: "location",
        contactIdx: 0,
        subject: "Signal Lost: remote research-station location",
        goal: "Find a weathered coastal building that reads as a research station",
        status: "replied",
        lastOutboundAgo: 2 * DAY,
        lastInboundAgo: 4 * HOUR,
        messages: [
          { dir: "outbound", body: "We're after a remote, weather-beaten coastal building for a storm-set thriller, exteriors and a couple of interiors. Anything on your books?", agoMs: 2 * DAY },
          { dir: "inbound", body: "There's an old lifeboat station that would be perfect. I'll send photos and availability tomorrow.", agoMs: 4 * HOUR },
        ],
      },
      {
        kind: "gear",
        contactIdx: 1,
        subject: "Signal Lost: 1980s radio console",
        goal: "Hire a practical 1980s radio console with working lights",
        status: "waiting",
        followupCount: 2,
        lastOutboundAgo: 7 * DAY,
        messages: [
          { dir: "outbound", body: "Do you hire period radio consoles, 1980s era, with practical lights we can trigger on camera? One week.", agoMs: 9 * DAY },
        ],
      },
    ],
  },
];

export const seedIfEmpty = mutation({
  args: {},
  handler: async (ctx): Promise<{ seeded: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    // Only seed a genuinely empty account.
    const existing = await ctx.db
      .query("productions")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();
    if (existing) return { seeded: 0 };

    const now = Date.now();
    let count = 0;

    for (const p of SEED) {
      const productionId: Id<"productions"> = await ctx.db.insert("productions", {
        name: p.name,
        logline: p.logline,
        ownerId: userId,
        status: "active",
        inboxId: p.inbox,
        inboxAddress: p.inbox,
      });

      await ctx.db.insert("scripts", {
        productionId,
        title: "Script",
        text: p.scriptText,
        uploadedBy: userId,
      });

      for (const b of p.breakdown) {
        await ctx.db.insert("breakdownItems", {
          productionId,
          category: b.category,
          name: b.name,
          detail: b.detail,
          sceneRefs: b.sceneRefs,
          status: b.status,
        });
      }

      const contactIds: Id<"contacts">[] = [];
      for (const c of p.contacts) {
        contactIds.push(
          await ctx.db.insert("contacts", {
            productionId,
            name: c.name,
            email: c.email,
            role: c.role,
            company: c.company,
            sourceUrl: c.sourceUrl,
          }),
        );
      }

      for (const e of p.errands) {
        const contactId = contactIds[e.contactIdx];
        const threadId = `seed-${Math.random().toString(36).slice(2, 10)}`;
        const errandId: Id<"errands"> = await ctx.db.insert("errands", {
          productionId,
          contactId,
          kind: e.kind,
          subject: e.subject,
          goal: e.goal,
          status: e.status,
          providerThreadId: threadId,
          followupCount: e.followupCount ?? 0,
          lastOutboundAt: e.lastOutboundAgo ? now - e.lastOutboundAgo : undefined,
          lastInboundAt: e.lastInboundAgo ? now - e.lastInboundAgo : undefined,
          nextFollowupAt:
            e.status === "waiting" ? now + 3 * DAY : undefined,
        });

        const contact = await ctx.db.get(contactId);
        for (const m of e.messages) {
          await ctx.db.insert("messages", {
            errandId,
            productionId,
            direction: m.dir,
            from: m.dir === "outbound" ? p.inbox : contact?.email ?? "",
            to: m.dir === "outbound" ? contact?.email ?? "" : p.inbox,
            subject: e.subject,
            body: m.body,
            providerThreadId: threadId,
            sentAt: now - m.agoMs,
          });
        }

        if (e.quote) {
          await ctx.db.insert("quotes", {
            errandId,
            productionId,
            contactId,
            kind: e.kind,
            amount: e.quote.amount,
            currency: e.quote.currency,
            terms: e.quote.terms,
            status: e.quote.status,
            receivedAt: now - (e.lastInboundAgo ?? DAY),
          });
        }
      }
      count++;
    }

    return { seeded: count };
  },
});
