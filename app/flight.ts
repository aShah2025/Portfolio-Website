export type FlightPhase = "runway" | "takeoff" | "portfolio";

export type FlightState = {
  phase: FlightPhase;
  startedAt: number;
};

export const TAKEOFF_MS = 2800;
