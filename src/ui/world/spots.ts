// Sprint 12 (LAG-94): what the 3D home needs to know about hotspots and poses, without importing three
// (so the app shell can use it before the room's chunk loads).
import type { HotspotId } from '../../sim/actions';
import type { Activity } from '../../sim/types';

/** Order of the spots in the "Room actions" list and the WebGL fallback. */
export const HOTSPOT_ORDER: readonly HotspotId[] = ['bed', 'desk', 'ringlight', 'tv', 'fridge', 'shower', 'table', 'door'];

export type PoseKind = 'lie' | 'sit' | 'work' | 'busy' | 'stand';

/** Where the character is and what it's doing while an activity runs. */
export interface PoseSpec {
  spot: HotspotId | 'center';
  kind: PoseKind;
}

const SPOT_POSE: Partial<Record<HotspotId, PoseKind>> = { bed: 'lie', desk: 'sit', tv: 'sit', ringlight: 'work' };

/** The pose for a running activity. `origin` is the spot whose action started it (null when started from the phone). */
export function poseFor(act: Activity, origin: HotspotId | null): PoseSpec {
  if (origin) return { spot: origin, kind: SPOT_POSE[origin] ?? 'busy' };
  switch (act.kind) {
    case 'sleep':
      return { spot: 'bed', kind: 'lie' };
    case 'beat':
    case 'episode':
      return { spot: 'desk', kind: 'sit' };
    case 'project':
      return act.projectAction === 'write' || act.projectAction === 'edit' || act.projectAction === 'deck'
        ? { spot: 'desk', kind: 'sit' }
        : { spot: 'center', kind: 'busy' };
    case 'prep':
      return { spot: 'ringlight', kind: 'work' };
    case 'leisure':
      return act.leisureId === 'tv' ? { spot: 'tv', kind: 'sit' } : { spot: 'center', kind: 'busy' };
    case 'travel':
      return { spot: 'door', kind: 'stand' };
    default:
      return { spot: 'center', kind: 'busy' };
  }
}

/** Cheap check before downloading three: can this browser make a WebGL context at all? */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}
