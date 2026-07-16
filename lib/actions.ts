// Barrel for the server-action domain modules. Deliberately NO "use server"
// directive here — each module under lib/actions/ carries it at definition, so
// these are plain re-exports and existing "@/lib/actions" imports keep working.
export * from "./actions/auth";
export * from "./actions/workout";
export * from "./actions/profile";
export * from "./actions/nutrition";
export * from "./actions/body";
export * from "./actions/cache";
