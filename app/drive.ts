// How far through the drive scene the car has gone, shared by the 3D scene, the HUD and the engine sound.
// The car idles while the camera circles it, then launches at LAUNCH and accelerates evenly to the end.
export const LAUNCH = 0.3;
export const TOP_MPH = 70;
const DISTANCE = 160; // metres covered by the end of the scroll

export function drive(p: number) {
  const t = Math.min(1, Math.max(0, (p - LAUNCH) / (1 - LAUNCH)));
  return { t, dist: DISTANCE * t * t, mph: TOP_MPH * t };
}
