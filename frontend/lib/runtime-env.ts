const PRODUCTION_BUILD_PHASE = "phase-production-build";

/**
 * `next build` sets NODE_ENV=production before page data collection, so code
 * that validates deployment env vars eagerly would otherwise fail every local
 * build that does not export them. Deployment builds still receive the real
 * values, and runtime production code keeps its strict validation.
 */
export function isProductionBuild(): boolean {
  return (
    typeof process !== "undefined" &&
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE === PRODUCTION_BUILD_PHASE
  );
}
