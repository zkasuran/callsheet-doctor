import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sweep for waiting errands whose follow-up time has passed, every 6 hours.
crons.interval("followup sweep", { hours: 6 }, internal.followups.sweep);

export default crons;
