import { mutation, internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createInbox } from "./lib/agentmail";
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
        kind: "gear", contactIdx: 0,
        subject: "Midnight Run: 1968 Mustang picture car",
        goal: "Rent a running 1968 Mustang, matte black, for a 3-night shoot",
        status: "confirmed", lastOutboundAgo: 2 * DAY, lastInboundAgo: 1 * DAY,
        messages: [
          { dir: "outbound", body: "Hi Alan, we're prepping Midnight Run and need a running 1968 Mustang in matte black for three shoot nights next month. Do you have one available, and what's the day rate? Thanks, the Midnight Run team.", agoMs: 3 * DAY },
          { dir: "inbound", body: "We have a '68 fastback, recently resprayed satin black. $1,200/day including delivery within 30 miles. Happy to hold the dates.", agoMs: 2 * DAY },
          { dir: "outbound", body: "Perfect, please hold all three nights. We'll send the insurance certificate this week.", agoMs: 1 * DAY },
        ],
        quote: { amount: 3600, currency: "USD", terms: "3 days at $1,200 incl. delivery", status: "accepted" },
      },
      {
        kind: "location", contactIdx: 2,
        subject: "Midnight Run: night shoot permit, harbour district",
        goal: "Secure a night filming permit for the warehouse district, 10pm to 4am",
        status: "negotiating", lastOutboundAgo: 1 * DAY, lastInboundAgo: 6 * HOUR,
        messages: [
          { dir: "outbound", body: "Hello, we'd like to apply for a night filming permit in the harbour warehouse district, 10pm to 4am across three nights. What's the process and lead time?", agoMs: 2 * DAY },
          { dir: "inbound", body: "Night permits need 10 business days and a $450 fee per night. We'll also need proof of $2M liability. Can you confirm exact dates?", agoMs: 6 * HOUR },
        ],
        quote: { amount: 1350, currency: "USD", terms: "3 nights at $450", status: "proposed" },
      },
      {
        kind: "crew", contactIdx: 3,
        subject: "Midnight Run: marine safety supervisor",
        goal: "Hire a certified dive safety supervisor for the pier scene",
        status: "waiting", followupCount: 1, lastOutboundAgo: 4 * DAY,
        messages: [
          { dir: "outbound", body: "Hi, we have a dawn scene with two divers surfacing beside a pier and need a certified marine safety supervisor on set. Are you available and what's your rate?", agoMs: 4 * DAY },
        ],
      },
      {
        kind: "gear", contactIdx: 1,
        subject: "Midnight Run: night-rated camera drone",
        goal: "Source a camera drone and operator licensed for night flight over water",
        status: "replied", lastOutboundAgo: 3 * DAY, lastInboundAgo: 2 * HOUR,
        messages: [
          { dir: "outbound", body: "We need a camera drone and operator cleared for night flight over water for one dawn scene. Do you cover that?", agoMs: 3 * DAY },
          { dir: "inbound", body: "We do, our operator holds a night + over-water waiver. Can you share the shot list so I can quote?", agoMs: 2 * HOUR },
        ],
      },
    ],
  },
  {
    name: "The Long Table",
    logline: "Three generations reopen their late grandmother's restaurant.",
    inbox: "the-long-table-demo@agentmail.to",
    scriptText:
      "INT. FAMILY RESTAURANT - DAY. Dust sheets come off old tables. MARISOL reads her grandmother's recipe cards. EXT. FARMERS MARKET - MORNING. The family shops for opening night.",
    breakdown: [
      { category: "location", name: "Vintage restaurant interior", detail: "Practical kitchen, 40 covers", sceneRefs: ["1"], status: "cured" },
      { category: "catering", name: "Opening-night menu tasting", detail: "8 regional hero plates", status: "sourcing" },
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
        kind: "location", contactIdx: 0,
        subject: "The Long Table: restaurant + practical kitchen",
        goal: "Book a vintage restaurant with a working kitchen for four days",
        status: "confirmed", lastOutboundAgo: 5 * DAY, lastInboundAgo: 3 * DAY,
        messages: [
          { dir: "outbound", body: "Hi, we're shooting a warm family drama and love your dining room and open kitchen. Could we book four consecutive days, crew of 25?", agoMs: 6 * DAY },
          { dir: "inbound", body: "We'd be glad to host. $2,000/day, kitchen included, as long as we can reopen for dinner by 6pm. Deal?", agoMs: 3 * DAY },
          { dir: "outbound", body: "That works, we'll wrap the kitchen by 5. Sending the agreement now.", agoMs: 3 * DAY },
        ],
        quote: { amount: 8000, currency: "USD", terms: "4 days at $2,000, kitchen included", status: "accepted" },
      },
      {
        kind: "cast", contactIdx: 2,
        subject: "The Long Table: Spanish-speaking grandmother",
        goal: "Cast a warm, Spanish-speaking actor in her 60s for flashbacks",
        status: "negotiating", lastOutboundAgo: 2 * DAY, lastInboundAgo: 5 * HOUR,
        messages: [
          { dir: "outbound", body: "We're casting a grandmother role, 60s, warm presence, fluent Spanish, three flashback days. Can you send options and rates?", agoMs: 2 * DAY },
          { dir: "inbound", body: "I have four strong candidates. Session fee is $600, plus my finder's fee. Want tapes this week?", agoMs: 5 * HOUR },
        ],
        quote: { amount: 2400, currency: "USD", terms: "3 days at $600 + session", status: "proposed" },
      },
      {
        kind: "location", contactIdx: 1,
        subject: "The Long Table: filming at the farmers market",
        goal: "Get a slot to film at a working farmers market at dawn",
        status: "waiting", followupCount: 0, lastOutboundAgo: 1 * DAY,
        messages: [
          { dir: "outbound", body: "Hello, we'd love to film a short morning scene among your stalls before opening. Is there a film liaison for timing and fees?", agoMs: 1 * DAY },
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
        kind: "location", contactIdx: 0,
        subject: "Signal Lost: remote research-station location",
        goal: "Find a weathered coastal building that reads as a research station",
        status: "replied", lastOutboundAgo: 2 * DAY, lastInboundAgo: 4 * HOUR,
        messages: [
          { dir: "outbound", body: "We're after a remote, weather-beaten coastal building for a storm-set thriller, exteriors and a couple of interiors. Anything on your books?", agoMs: 2 * DAY },
          { dir: "inbound", body: "There's an old lifeboat station that would be perfect. I'll send photos and availability tomorrow.", agoMs: 4 * HOUR },
        ],
      },
      {
        kind: "gear", contactIdx: 1,
        subject: "Signal Lost: 1980s radio console",
        goal: "Hire a practical 1980s radio console with working lights",
        status: "waiting", followupCount: 2, lastOutboundAgo: 7 * DAY,
        messages: [
          { dir: "outbound", body: "Do you hire period radio consoles, 1980s era, with practical lights we can trigger on camera? One week.", agoMs: 9 * DAY },
        ],
      },
    ],
  },
  {
    name: "Paper Planes",
    logline: "A shy kid and a retired pilot rebuild a glider to enter the county fair.",
    inbox: "paper-planes-demo@agentmail.to",
    scriptText:
      "EXT. AIRFIELD - DAY. A patched glider sits in tall grass. SAM, 11, hands a wrench to old ROY. INT. HANGAR - DAY. Blueprints and coffee.",
    breakdown: [
      { category: "location", name: "Grass airfield", detail: "Day exterior, glider room", sceneRefs: ["1"], status: "cured" },
      { category: "gear", name: "Vintage glider (picture)", detail: "Non-flying, tow-able", sceneRefs: ["1"], status: "sourcing" },
      { category: "cast", name: "Child lead (11)", detail: "Local, work permit needed", status: "gap" },
      { category: "permit", name: "Minor work permit", detail: "Child performer, 3 days", status: "gap" },
      { category: "insurance", name: "Aviation-site cover", detail: "Airfield liability", status: "gap" },
    ],
    contacts: [
      { name: "County Airfield", email: "ops@countyairfield.example", role: "Ground ops", company: "County Airfield Trust" },
      { name: "Warbird Props", email: "hire@warbirdprops.example", role: "Hire desk", company: "Warbird Props" },
    ],
    errands: [
      {
        kind: "location", contactIdx: 0,
        subject: "Paper Planes: grass airfield for a family film",
        goal: "Book a quiet grass airfield with hangar access for four days",
        status: "confirmed", lastOutboundAgo: 6 * DAY, lastInboundAgo: 4 * DAY,
        messages: [
          { dir: "outbound", body: "We're shooting a gentle family film about a kid and a glider. Could we use a corner of the field and a hangar for four days?", agoMs: 7 * DAY },
          { dir: "inbound", body: "Weekdays are quiet, happy to help. $900/day, you keep clear of the active runway. Works?", agoMs: 4 * DAY },
        ],
        quote: { amount: 3600, currency: "USD", terms: "4 days at $900", status: "accepted" },
      },
      {
        kind: "gear", contactIdx: 1,
        subject: "Paper Planes: non-flying picture glider",
        goal: "Hire a tow-able vintage glider for a hero prop",
        status: "replied", lastOutboundAgo: 2 * DAY, lastInboundAgo: 3 * HOUR,
        messages: [
          { dir: "outbound", body: "Looking for a vintage glider we don't need to fly, just tow and dress. Anything suitable?", agoMs: 2 * DAY },
          { dir: "inbound", body: "We have two. One's mid-restoration and photographs beautifully. Send dates and I'll quote.", agoMs: 3 * HOUR },
        ],
      },
    ],
  },
  {
    name: "Neon Alley",
    logline: "A noodle-cart cook moonlights as a courier in a rain-soaked cyber-city.",
    inbox: "neon-alley-demo@agentmail.to",
    scriptText:
      "EXT. NIGHT MARKET - NIGHT. Steam and neon. KENJI ladles broth as a drone buzzes overhead. INT. BACK ALLEY - NIGHT. Rain machine. A package changes hands.",
    breakdown: [
      { category: "location", name: "Night market alley", detail: "Neon, wet-down street", sceneRefs: ["1"], status: "sourcing" },
      { category: "gear", name: "Rain tower + effects", detail: "Alley wet-down rig", sceneRefs: ["2"], status: "gap" },
      { category: "gear", name: "Practical neon signage", detail: "Bilingual, custom", sceneRefs: ["1"], status: "cured" },
      { category: "catering", name: "Working noodle cart", detail: "Steam, hero food", status: "sourcing" },
      { category: "permit", name: "Street use + FX permit", detail: "Water FX after dark", status: "gap" },
    ],
    contacts: [
      { name: "Glowworks Signs", email: "studio@glowworks.example", role: "Fabricator", company: "Glowworks Neon" },
      { name: "City Film Office", email: "permits@cityfilm.example", role: "Permits", company: "City Film Office" },
    ],
    errands: [
      {
        kind: "gear", contactIdx: 0,
        subject: "Neon Alley: custom bilingual neon signs",
        goal: "Fabricate practical neon signage for the market set",
        status: "confirmed", lastOutboundAgo: 8 * DAY, lastInboundAgo: 5 * DAY,
        messages: [
          { dir: "outbound", body: "We need a cluster of practical neon signs, bilingual, for a night-market set. Can you fabricate to our art department's designs?", agoMs: 9 * DAY },
          { dir: "inbound", body: "Absolutely, that's our specialty. Ballpark $2,800 for six signs, two-week build. Send the artwork.", agoMs: 5 * DAY },
        ],
        quote: { amount: 2800, currency: "USD", terms: "6 signs, 2-week build", status: "accepted" },
      },
      {
        kind: "permit", contactIdx: 1,
        subject: "Neon Alley: street + water-FX permit",
        goal: "Permit a night street shoot with rain effects",
        status: "negotiating", lastOutboundAgo: 2 * DAY, lastInboundAgo: 7 * HOUR,
        messages: [
          { dir: "outbound", body: "We'd like to shoot a night alley scene with a rain tower. What does a street-use plus water-FX permit involve?", agoMs: 2 * DAY },
          { dir: "inbound", body: "Water FX needs a runoff plan and a $700 permit, plus a fire marshal on standby. Can you provide the plan?", agoMs: 7 * HOUR },
        ],
        quote: { amount: 700, currency: "USD", terms: "Street + water FX permit", status: "proposed" },
      },
    ],
  },
  {
    name: "The Bakehouse",
    logline: "A rival bakery opens across the street from a beloved family shop.",
    inbox: "the-bakehouse-demo@agentmail.to",
    scriptText:
      "INT. BAKERY - DAWN. Flour dust in the light. PRIYA pipes a wedding cake. EXT. HIGH STREET - DAY. A slick new bakery unveils its sign.",
    breakdown: [
      { category: "location", name: "Working bakery", detail: "Practical ovens, dawn light", sceneRefs: ["1"], status: "cured" },
      { category: "catering", name: "Hero cakes + bakes", detail: "Continuity duplicates", status: "sourcing" },
      { category: "location", name: "High-street shopfront", detail: "For the rival bakery", sceneRefs: ["2"], status: "gap" },
      { category: "cast", name: "Cake decorator double", detail: "Real piping hands", status: "gap" },
    ],
    contacts: [
      { name: "Sunrise Bakery", email: "hello@sunrisebakery.example", role: "Owner", company: "Sunrise Bakery" },
      { name: "Sugarcraft Studio", email: "orders@sugarcraft.example", role: "Cake artist", company: "Sugarcraft Studio" },
    ],
    errands: [
      {
        kind: "location", contactIdx: 0,
        subject: "The Bakehouse: film in a working bakery",
        goal: "Shoot in a real bakery with practical ovens over three dawns",
        status: "confirmed", lastOutboundAgo: 4 * DAY, lastInboundAgo: 2 * DAY,
        messages: [
          { dir: "outbound", body: "We love your bakery for a warm comedy-drama. Could we film three early mornings before you open, using the ovens as practicals?", agoMs: 5 * DAY },
          { dir: "inbound", body: "Sure, if we're baking by 7. $1,100/morning. We'll keep out of your shots.", agoMs: 2 * DAY },
        ],
        quote: { amount: 3300, currency: "USD", terms: "3 mornings at $1,100", status: "accepted" },
      },
      {
        kind: "catering", contactIdx: 1,
        subject: "The Bakehouse: hero wedding cake + duplicates",
        goal: "Commission a hero wedding cake with continuity duplicates",
        status: "replied", lastOutboundAgo: 3 * DAY, lastInboundAgo: 6 * HOUR,
        messages: [
          { dir: "outbound", body: "We need a hero three-tier wedding cake plus two duplicates for continuity, filming over two days. Can you do continuity bakes?", agoMs: 3 * DAY },
          { dir: "inbound", body: "Yes, we do film work often. I'll price the hero plus two matching dupes and send it over.", agoMs: 6 * HOUR },
        ],
      },
    ],
  },
  {
    name: "Cold Open",
    logline: "A late-night talk show scrambles when the guest cancels on air.",
    inbox: "cold-open-demo@agentmail.to",
    scriptText:
      "INT. TV STUDIO - NIGHT. Warm applause. The HOST checks a card as a producer whispers: the guest just bailed.",
    breakdown: [
      { category: "location", name: "TV studio with audience seating", detail: "Talk-show set", sceneRefs: ["1"], status: "sourcing" },
      { category: "gear", name: "Multi-camera package", detail: "3-cam + jib", sceneRefs: ["1"], status: "gap" },
      { category: "cast", name: "Live studio audience (60)", detail: "Background, one night", status: "gap" },
      { category: "crew", name: "Camera operators x3", detail: "Multi-cam experienced", status: "gap" },
    ],
    contacts: [
      { name: "Studio 9 Rentals", email: "book@studio9.example", role: "Bookings", company: "Studio 9" },
      { name: "Crowd Casting", email: "book@crowdcasting.example", role: "Background", company: "Crowd Casting" },
    ],
    errands: [
      {
        kind: "location", contactIdx: 0,
        subject: "Cold Open: talk-show studio with audience seating",
        goal: "Rent a multi-camera studio with tiered audience seating for two days",
        status: "negotiating", lastOutboundAgo: 2 * DAY, lastInboundAgo: 8 * HOUR,
        messages: [
          { dir: "outbound", body: "We're shooting a talk-show scene and need a studio with real audience seating, two days including a pre-light. What can you offer?", agoMs: 2 * DAY },
          { dir: "inbound", body: "Studio B has 80 raked seats and a standing talk-show set. $4,500/day plus a pre-light day at half. Interested?", agoMs: 8 * HOUR },
        ],
        quote: { amount: 11250, currency: "USD", terms: "2 days + half pre-light at $4,500", status: "proposed" },
      },
      {
        kind: "cast", contactIdx: 1,
        subject: "Cold Open: 60 background audience",
        goal: "Book 60 background performers as a studio audience for one night",
        status: "waiting", followupCount: 0, lastOutboundAgo: 1 * DAY,
        messages: [
          { dir: "outbound", body: "We need around 60 background performers as a live studio audience for one evening. Can you crew that and what's the rate?", agoMs: 1 * DAY },
        ],
      },
    ],
  },
  {
    name: "Tidewater",
    logline: "A marine rescue team races a rising tide to reach a stranded family.",
    inbox: "tidewater-demo@agentmail.to",
    scriptText:
      "EXT. MUDFLATS - DUSK. A rescue RIB skips across shallow water. INT. LIFEBOAT STATION - NIGHT. Radios crackle; a map is marked.",
    breakdown: [
      { category: "location", name: "Tidal mudflats", detail: "Dusk, safety-critical", sceneRefs: ["1"], status: "sourcing" },
      { category: "gear", name: "Rescue RIB + coxswain", detail: "Picture boat, driver", sceneRefs: ["1"], status: "gap" },
      { category: "crew", name: "Water safety unit", detail: "Tidal, standby divers", status: "gap" },
      { category: "insurance", name: "Marine production cover", detail: "On-water, tidal risk", status: "gap" },
      { category: "location", name: "Lifeboat station interior", detail: "Practical radio room", sceneRefs: ["2"], status: "cured" },
    ],
    contacts: [
      { name: "Estuary Rangers", email: "film@estuaryrangers.example", role: "Access officer", company: "Estuary Trust" },
      { name: "Marine Film Safety", email: "ops@marinefilmsafety.example", role: "Safety lead", company: "Marine Film Safety" },
    ],
    errands: [
      {
        kind: "crew", contactIdx: 1,
        subject: "Tidewater: water safety unit for tidal shoot",
        goal: "Engage a water safety unit with standby divers for a tidal sequence",
        status: "negotiating", lastOutboundAgo: 3 * DAY, lastInboundAgo: 5 * HOUR,
        messages: [
          { dir: "outbound", body: "We're shooting a rescue sequence on tidal mudflats with a RIB. We need a full water safety unit with standby divers. Availability and rate?", agoMs: 3 * DAY },
          { dir: "inbound", body: "That's exactly our work. A unit of four plus two divers runs $3,200/day. We'll also want a tide-window plan. Shall we scope it?", agoMs: 5 * HOUR },
        ],
        quote: { amount: 6400, currency: "USD", terms: "2 days, unit of 4 + 2 divers", status: "proposed" },
      },
      {
        kind: "location", contactIdx: 0,
        subject: "Tidewater: access to the tidal mudflats",
        goal: "Get filming access and a tide window for the mudflats",
        status: "waiting", followupCount: 1, lastOutboundAgo: 5 * DAY,
        messages: [
          { dir: "outbound", body: "We'd like to film on the mudflats at dusk with a small boat unit. Could you advise on access, protected-area rules and tide windows?", agoMs: 5 * DAY },
        ],
      },
    ],
  },
  {
    name: "Understudy",
    logline: "A stage understudy gets one night to prove herself when the lead vanishes.",
    inbox: "understudy-demo@agentmail.to",
    scriptText:
      "INT. THEATRE WINGS - NIGHT. NORA mouths every line. The stage manager grabs her arm: you're on. INT. AUDITORIUM - NIGHT. A full house waits.",
    breakdown: [
      { category: "location", name: "Working theatre + auditorium", detail: "Stage, wings, house", sceneRefs: ["1", "2"], status: "cured" },
      { category: "cast", name: "Background theatre audience", detail: "150 seated", status: "gap" },
      { category: "gear", name: "Stage lighting board access", detail: "Practical lighting cues", status: "sourcing" },
      { category: "clearance", name: "Play excerpt rights", detail: "Short public-domain scene", status: "cured" },
    ],
    contacts: [
      { name: "Regent Theatre", email: "hires@regenttheatre.example", role: "Venue hire", company: "Regent Theatre" },
      { name: "Crowd Casting", email: "book@crowdcasting.example", role: "Background", company: "Crowd Casting" },
    ],
    errands: [
      {
        kind: "location", contactIdx: 0,
        subject: "Understudy: theatre for stage + backstage scenes",
        goal: "Hire a working theatre for two nights including the auditorium",
        status: "confirmed", lastOutboundAgo: 6 * DAY, lastInboundAgo: 4 * DAY,
        messages: [
          { dir: "outbound", body: "We need a theatre for a backstage drama, two nights, stage plus wings plus a dressed auditorium. Are dark nights available?", agoMs: 7 * DAY },
          { dir: "inbound", body: "We're dark Mondays and Tuesdays. $3,000/night with a house technician. That work for you?", agoMs: 4 * DAY },
        ],
        quote: { amount: 6000, currency: "USD", terms: "2 nights at $3,000 incl. technician", status: "accepted" },
      },
      {
        kind: "cast", contactIdx: 1,
        subject: "Understudy: 150 seated theatre audience",
        goal: "Book 150 background performers to fill the auditorium",
        status: "replied", lastOutboundAgo: 2 * DAY, lastInboundAgo: 4 * HOUR,
        messages: [
          { dir: "outbound", body: "We need to fill an auditorium with around 150 background performers for one night. Can you supply and manage that?", agoMs: 2 * DAY },
          { dir: "inbound", body: "We can. For 150 over an evening we'd quote per head plus coordination. I'll send a breakdown today.", agoMs: 4 * HOUR },
        ],
      },
    ],
  },
  {
    name: "Dust Bowl",
    logline: "Two siblings drive a failing farm truck across a drought-struck plain.",
    inbox: "dust-bowl-demo@agentmail.to",
    scriptText:
      "EXT. DIRT ROAD - DAY. Heat haze. A rusted pickup coughs along. INT. TRUCK - DAY. WYATT nurses the wheel; JUNE watches the fuel gauge fall.",
    breakdown: [
      { category: "location", name: "Open plains dirt road", detail: "Day, dust, wide vistas", sceneRefs: ["1"], status: "sourcing" },
      { category: "gear", name: "Period pickup (picture)", detail: "1950s, running, weathered", sceneRefs: ["1", "2"], status: "gap" },
      { category: "gear", name: "Process trailer / low-loader", detail: "For driving interiors", sceneRefs: ["2"], status: "gap" },
      { category: "travel", name: "Remote unit base + transport", detail: "3-hour drive, catering run", status: "gap" },
    ],
    contacts: [
      { name: "Prairie Film Ranch", email: "book@prairiefilm.example", role: "Location manager", company: "Prairie Film Ranch" },
      { name: "Vintage Motors Hire", email: "hire@vintagemotors.example", role: "Vehicle wrangler", company: "Vintage Motors" },
    ],
    errands: [
      {
        kind: "gear", contactIdx: 1,
        subject: "Dust Bowl: 1950s picture pickup",
        goal: "Hire a running, weathered 1950s pickup plus a wrangler",
        status: "negotiating", lastOutboundAgo: 2 * DAY, lastInboundAgo: 6 * HOUR,
        messages: [
          { dir: "outbound", body: "We need a 1950s pickup that runs and looks properly weathered, plus a wrangler, for a week on a remote shoot. What have you got?", agoMs: 2 * DAY },
          { dir: "inbound", body: "I have a '52 that's perfect and reliable. $850/day plus wrangler and mileage to your base. Want photos?", agoMs: 6 * HOUR },
        ],
        quote: { amount: 5950, currency: "USD", terms: "7 days at $850 + wrangler", status: "proposed" },
      },
      {
        kind: "location", contactIdx: 0,
        subject: "Dust Bowl: open plains dirt road",
        goal: "Secure a wide, controllable dirt road location for driving scenes",
        status: "waiting", followupCount: 0, lastOutboundAgo: 1 * DAY,
        messages: [
          { dir: "outbound", body: "We're after a long, dusty dirt road with big skies we can control for a couple of days of driving scenes. Anything on the ranch?", agoMs: 1 * DAY },
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
    return await seedForUser(ctx, userId);
  },
});

// Shared seeding core. Called by seedIfEmpty (self-serve) and by the auth
// afterUserCreatedOrUpdated callback (so a guest is populated the instant they sign in,
// with no client round-trip and no empty flash). Idempotent per user.
export async function seedForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<{ seeded: number }> {
    // Only seed a genuinely empty account.
    const existing = await ctx.db
      .query("productions")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();
    if (existing) return { seeded: 0 };

    const now = Date.now();
    let count = 0;
    let firstProductionId: Id<"productions"> | null = null;

    for (const p of SEED) {
      const isFirst = firstProductionId === null;
      const productionId: Id<"productions"> = await ctx.db.insert("productions", {
        name: p.name,
        logline: p.logline,
        ownerId: userId,
        status: "active",
        // The first production gets a real inbox provisioned right after (so Reply works
        // in the demo). The others carry an illustrative address for display only.
        inboxId: isFirst ? undefined : p.inbox,
        inboxAddress: isFirst ? undefined : p.inbox,
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
      if (isFirst) firstProductionId = productionId;
      count++;
    }

    // Provision one real AgentMail inbox for the first production so Reply works in the
    // demo. Scheduled so seeding stays instant and a provisioning hiccup never blocks it.
    if (firstProductionId) {
      await ctx.scheduler.runAfter(0, internal.seed.provisionSeedInbox, {
        productionId: firstProductionId,
      });
    }

    return { seeded: count };
}

/* ---------- provision a real inbox for the primary seeded production ---------- */

export const _getProduction = internalQuery({
  args: { productionId: v.id("productions") },
  handler: (ctx, { productionId }) => ctx.db.get(productionId),
});

export const _setInbox = internalMutation({
  args: { productionId: v.id("productions"), inboxId: v.string(), inboxAddress: v.string() },
  handler: (ctx, a) =>
    ctx.db.patch(a.productionId, { inboxId: a.inboxId, inboxAddress: a.inboxAddress }),
});

export const provisionSeedInbox = internalAction({
  args: { productionId: v.id("productions") },
  handler: async (ctx, { productionId }) => {
    const p = await ctx.runQuery(internal.seed._getProduction, { productionId });
    if (!p || p.inboxId) return;
    try {
      const username = `callsheet-demo-${Math.random().toString(36).slice(2, 8)}`;
      const res = await createInbox({ username, displayName: "Midnight Run via Callsheet Doctor" });
      const inboxId = res.inbox_id ?? res.inboxId ?? `${username}@agentmail.to`;
      const inboxAddress = res.email ?? res.email_address ?? inboxId;
      await ctx.runMutation(internal.seed._setInbox, { productionId, inboxId, inboxAddress });
    } catch {
      // If provisioning fails (e.g. AgentMail limit), the production simply shows the
      // provision-inbox flow like any other. Not fatal to the seed.
    }
  },
});
