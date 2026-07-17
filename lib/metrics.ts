// Barrel for the metrics domain modules under lib/metrics/. Preserves the
// module's historical public surface, including the todayKey passthrough and
// repTargetMin (which now lives with the other rep parsing in lib/reps.ts).
export { todayKey } from "./date";
export { repTargetMin } from "./reps";
export * from "./metrics/plan";
export * from "./metrics/enrollment";
export * from "./metrics/progress";
export * from "./metrics/history";
export * from "./metrics/body";
export * from "./metrics/nutrition";
export * from "./metrics/activity";
export * from "./metrics/insights";
export * from "./metrics/strength";
export * from "./metrics/review";
