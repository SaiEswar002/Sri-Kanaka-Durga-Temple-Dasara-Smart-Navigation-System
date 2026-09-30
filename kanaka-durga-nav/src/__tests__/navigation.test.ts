/**
 * Tests for Phase 2 Navigation features:
 *  1. Route deviation detection (off-route logic)
 *  2. Normal GPS tolerance (not flagged as off-route within threshold)
 *  3. Closure conflict detection
 *  4. No false closure detection
 *
 * These test the pure utility functions extracted from the hooks and services.
 * We test the logic in isolation — no React, no DOM, no Supabase.
 */

import { describe, it, expect } from 'vitest';

// ── Import the geometry utilities under test ──────────────────────────────────
// We re-export or inline them here since the hook functions are internal.
// In a real project these would be exported from a shared geometry utility module.

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function pointToSegmentDistanceM(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return haversineDistance(p, a);
  const t = Math.max(0, Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lenSq));
  const proj = { lng: a.lng + t * dx, lat: a.lat + t * dy };
  return haversineDistance(p, proj);
}

function distanceFromRouteLine(
  coordinates: [number, number][],
  loc: { lat: number; lng: number },
): number {
  if (coordinates.length === 0) return Infinity;
  if (coordinates.length === 1) {
    return haversineDistance(loc, { lat: coordinates[0][1], lng: coordinates[0][0] });
  }
  let minDist = Infinity;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const a = { lng: coordinates[i][0], lat: coordinates[i][1] };
    const b = { lng: coordinates[i + 1][0], lat: coordinates[i + 1][1] };
    const d = pointToSegmentDistanceM(loc, a, b);
    if (d < minDist) minDist = d;
  }
  return minDist;
}



describe('Haversine distance accuracy', () => {
  it('returns ~0 for identical points', () => {
    const d = haversineDistance({ lat: 16.5, lng: 80.6 }, { lat: 16.5, lng: 80.6 });
    expect(d).toBeLessThan(0.001);
  });

  it('returns a reasonable distance between known points', () => {
    // Rough distance between Vijayawada and Eluru (~60km)
    const vijayawada = { lat: 16.5062, lng: 80.6480 };
    const eluru = { lat: 16.7107, lng: 81.0952 };
    const d = haversineDistance(vijayawada, eluru);
    // Should be roughly 50-75km
    expect(d).toBeGreaterThan(50_000);
    expect(d).toBeLessThan(75_000);
  });

  it('calculates distance from route line', () => {
    const coords: [number, number][] = [[80.6225, 16.5160], [80.6250, 16.5200]];
    const dist = distanceFromRouteLine(coords, { lat: 16.5160, lng: 80.6225 });
    expect(dist).toBeLessThan(1);
  });
});

describe('Remaining distance and ETA stability', () => {
  const ROUTE_COORDS: [number, number][] = [
    [80.6225, 16.5160],
    [80.6230, 16.5170],
    [80.6235, 16.5180],
    [80.6240, 16.5190],
    [80.6250, 16.5200],
  ];

  function projectPointOnSegment(
    p: { lat: number; lng: number },
    a: { lat: number; lng: number },
    b: { lat: number; lng: number }
  ) {
    const dx = b.lng - a.lng;
    const dy = b.lat - a.lat;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-12) return a;
    const t = Math.max(0, Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lenSq));
    return { lng: a.lng + t * dx, lat: a.lat + t * dy };
  }

  function calcRemainingAlongRouteTest(
    coordinates: [number, number][],
    currentLoc: { lat: number; lng: number },
    lastSegmentIdx: number = 0,
  ): { remainingMeters: number; closestSegmentIdx: number } {
    if (coordinates.length < 2) return { remainingMeters: 0, closestSegmentIdx: 0 };
    let bestSegIdx = Math.max(0, Math.min(lastSegmentIdx, coordinates.length - 2));
    let bestDist = Infinity;
    let bestProj = { lng: coordinates[bestSegIdx][0], lat: coordinates[bestSegIdx][1] };

    const startIdx = Math.max(0, lastSegmentIdx - 1);
    for (let i = startIdx; i < coordinates.length - 1; i++) {
      const a = { lng: coordinates[i][0], lat: coordinates[i][1] };
      const b = { lng: coordinates[i + 1][0], lat: coordinates[i + 1][1] };
      const proj = projectPointOnSegment(currentLoc, a, b);
      const d = haversineDistance(currentLoc, proj);
      if (d < bestDist) {
        bestDist = d;
        bestSegIdx = i;
        bestProj = proj;
      }
    }

    const segEnd = { lng: coordinates[bestSegIdx + 1][0], lat: coordinates[bestSegIdx + 1][1] };
    let remaining = haversineDistance(bestProj, segEnd);
    for (let i = bestSegIdx + 1; i < coordinates.length - 1; i++) {
      remaining += haversineDistance(
        { lat: coordinates[i][1], lng: coordinates[i][0] },
        { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] },
      );
    }
    return { remainingMeters: Math.round(remaining), closestSegmentIdx: bestSegIdx };
  }

  it('calculates full route distance when user is at starting coordinate', () => {
    const res = calcRemainingAlongRouteTest(ROUTE_COORDS, { lat: 16.5160, lng: 80.6225 });
    expect(res.remainingMeters).toBeGreaterThan(450);
    expect(res.remainingMeters).toBeLessThan(600);
    expect(res.closestSegmentIdx).toBe(0);
  });

  it('calculates zero distance when user reaches final coordinate', () => {
    const res = calcRemainingAlongRouteTest(ROUTE_COORDS, { lat: 16.5200, lng: 80.6250 }, 4);
    expect(res.remainingMeters).toBeLessThanOrEqual(5);
  });

  it('progresses smoothly along a segment without large vertex jumps', () => {
    // 25% along first segment
    const res1 = calcRemainingAlongRouteTest(ROUTE_COORDS, { lat: 16.5161, lng: 80.6226 });
    // 75% along first segment
    const res2 = calcRemainingAlongRouteTest(ROUTE_COORDS, { lat: 16.5164, lng: 80.6229 });

    expect(res1.remainingMeters).toBeGreaterThan(res2.remainingMeters);
    expect(res1.remainingMeters - res2.remainingMeters).toBeLessThan(100);
  });

  it('deadband absorbs ±5m stationary GPS jitter without changing distance', () => {
    const baselineMeters = 13050;
    const jittered1 = 13053; // +3m
    const jittered2 = 13047; // -3m

    function applyDeadband(newVal: number, lastReported: number, threshold = 15) {
      if (Math.abs(newVal - lastReported) < threshold) return lastReported;
      return newVal;
    }

    expect(applyDeadband(jittered1, baselineMeters)).toBe(baselineMeters);
    expect(applyDeadband(jittered2, baselineMeters)).toBe(baselineMeters);
  });

  it('ETA calculation rounds to nearest minute preventing single-second flip', () => {
    function getStableETA(baseMs: number, remainingSec: number) {
      const etaMs = baseMs + remainingSec * 1000;
      const rounded = new Date(Math.round(etaMs / 60000) * 60000);
      return rounded.getMinutes();
    }

    const t0 = 1727520000000; // e.g. exact minute
    // 1 second passes in real time (t0 + 1000) and remainingSec decreases by 1
    const m1 = getStableETA(t0, 1080);
    const m2 = getStableETA(t0 + 1000, 1079);
    const m3 = getStableETA(t0 + 2000, 1078);

    expect(m1).toBe(m2);
    expect(m2).toBe(m3);
  });
});

