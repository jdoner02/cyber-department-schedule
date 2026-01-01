/**
 * =============================================================================
 * MODULE: Campus Buildings
 * =============================================================================
 *
 * PURPOSE: Building data and walking time matrix for EWU campuses
 *
 * EDUCATIONAL NOTES:
 * - EWU has two main campuses: Cheney (main) and Spokane U-District
 * - Cross-campus travel is not feasible between consecutive classes
 * - Walking times are estimates based on typical walking pace (3-4 mph)
 *
 * DESIGN PATTERN: Adjacency Matrix
 * - Walking times are stored as a matrix for O(1) lookup
 * - This is similar to how graph algorithms represent weighted edges
 * - The matrix is symmetric (A to B = B to A)
 *
 * DATA SOURCE: Manual estimates based on campus maps
 * =============================================================================
 */

import type { CampusBuilding, Campus } from '../types/advising';

/**
 * All campus buildings with coordinates for SVG map
 *
 * EDUCATIONAL NOTE - Coordinate System:
 * Map positions use a normalized 0-1000 coordinate space.
 * This makes it easy to scale the SVG to any size.
 * The origin (0,0) is top-left of the campus map.
 */
export const CAMPUS_BUILDINGS: Record<string, CampusBuilding> = {
  // === Cheney Campus - Computer Science / Engineering Area ===
  CEB: {
    code: 'CEB',
    name: 'Computer Engineering Building',
    campus: 'Cheney',
    mapPosition: { x: 650, y: 350 },
    description: 'Home of Computer Science and Cybersecurity programs',
  },
  KGS: {
    code: 'KGS',
    name: 'Kingston Hall',
    campus: 'Cheney',
    mapPosition: { x: 550, y: 280 },
    description: 'Science classrooms and labs',
  },
  SHW: {
    code: 'SHW',
    name: 'Shaw Hall',
    campus: 'Cheney',
    mapPosition: { x: 480, y: 320 },
    description: 'General classrooms',
  },
  HAR: {
    code: 'HAR',
    name: 'Hargreaves Hall',
    campus: 'Cheney',
    mapPosition: { x: 420, y: 400 },
    description: 'Administration and classrooms',
  },

  // === Cheney Campus - Central Area ===
  PUB: {
    code: 'PUB',
    name: 'Pence Union Building',
    campus: 'Cheney',
    mapPosition: { x: 500, y: 450 },
    description: 'Student union, dining, services',
  },
  JFK: {
    code: 'JFK',
    name: 'JFK Library',
    campus: 'Cheney',
    mapPosition: { x: 550, y: 500 },
    description: 'Main library',
  },
  SCI: {
    code: 'SCI',
    name: 'Science Building',
    campus: 'Cheney',
    mapPosition: { x: 620, y: 420 },
    description: 'Physics and Chemistry labs',
  },

  // === Cheney Campus - Math/Arts Area ===
  MHN: {
    code: 'MHN',
    name: 'Martin Hall',
    campus: 'Cheney',
    mapPosition: { x: 380, y: 350 },
    description: 'Mathematics department',
  },
  PAT: {
    code: 'PAT',
    name: 'Patterson Hall',
    campus: 'Cheney',
    mapPosition: { x: 450, y: 280 },
    description: 'General classrooms',
  },

  // === Cheney Campus - Other ===
  REC: {
    code: 'REC',
    name: 'Recreation Center',
    campus: 'Cheney',
    mapPosition: { x: 700, y: 500 },
    description: 'Gym and recreation facilities',
  },
  CWH: {
    code: 'CWH',
    name: 'Cadet Hall',
    campus: 'Cheney',
    mapPosition: { x: 320, y: 450 },
    description: 'ROTC and military science',
  },

  // === Spokane U-District Campus ===
  CAT: {
    code: 'CAT',
    name: 'Catalyst Building',
    campus: 'Spokane U-District',
    mapPosition: { x: 200, y: 200 },
    description: 'Main Spokane academic building',
  },
  SAC: {
    code: 'SAC',
    name: 'Spokane Academic Center',
    campus: 'Spokane U-District',
    mapPosition: { x: 280, y: 250 },
    description: 'Additional Spokane classrooms',
  },

  // === Online / Special ===
  WEB: {
    code: 'WEB',
    name: 'Online',
    campus: 'Online',
    mapPosition: { x: 0, y: 0 },
    description: 'Fully online courses',
  },
  TBA: {
    code: 'TBA',
    name: 'To Be Announced',
    campus: 'TBA',
    mapPosition: { x: 0, y: 0 },
    description: 'Location to be determined',
  },
};

/**
 * Walking time matrix between buildings (in minutes)
 *
 * EDUCATIONAL NOTE - Adjacency Matrix:
 * This is a weighted adjacency matrix where:
 * - Keys are building code pairs: "FROM:TO"
 * - Values are walking times in minutes
 * - The matrix is symmetric, so we only store one direction
 * - Special value -1 means cross-campus (not walkable)
 *
 * Walking times assume average walking speed of ~3.5 mph.
 * Times include typical obstacles (doors, stairs, crowds).
 */
const WALKING_TIMES_RAW: Record<string, number> = {
  // === CEB (Computer Engineering Building) connections ===
  'CEB:KGS': 4,   // Adjacent buildings
  'CEB:SCI': 3,   // Very close
  'CEB:SHW': 5,   // Short walk
  'CEB:HAR': 6,   // Moderate walk
  'CEB:PUB': 5,   // Moderate walk
  'CEB:JFK': 6,   // Moderate walk
  'CEB:MHN': 8,   // Across campus
  'CEB:PAT': 6,   // Moderate walk
  'CEB:REC': 5,   // Adjacent area
  'CEB:CWH': 10,  // Far side of campus

  // === KGS (Kingston Hall) connections ===
  'KGS:SHW': 3,   // Adjacent
  'KGS:SCI': 4,   // Close
  'KGS:HAR': 5,   // Short walk
  'KGS:PUB': 5,   // Moderate
  'KGS:JFK': 7,   // Moderate
  'KGS:MHN': 6,   // Moderate
  'KGS:PAT': 2,   // Adjacent

  // === SHW (Shaw Hall) connections ===
  'SHW:HAR': 3,   // Adjacent
  'SHW:MHN': 4,   // Close
  'SHW:PAT': 3,   // Close
  'SHW:PUB': 4,   // Short walk

  // === HAR (Hargreaves) connections ===
  'HAR:MHN': 3,   // Close
  'HAR:PUB': 4,   // Close
  'HAR:CWH': 5,   // Moderate

  // === PUB (Student Union) connections ===
  'PUB:JFK': 2,   // Adjacent
  'PUB:MHN': 5,   // Moderate
  'PUB:REC': 7,   // Across campus

  // === JFK (Library) connections ===
  'JFK:SCI': 4,   // Close
  'JFK:REC': 5,   // Moderate

  // === Spokane Campus (internal) ===
  'CAT:SAC': 3,   // Adjacent buildings

  // === Cross-campus (Cheney to Spokane) - marked as impossible ===
  // -1 indicates cross-campus travel (approximately 20-minute drive)
  'CEB:CAT': -1,
  'CEB:SAC': -1,
  'KGS:CAT': -1,
  'KGS:SAC': -1,
  'SHW:CAT': -1,
  'SHW:SAC': -1,
  'HAR:CAT': -1,
  'HAR:SAC': -1,
  'PUB:CAT': -1,
  'PUB:SAC': -1,
  'JFK:CAT': -1,
  'JFK:SAC': -1,
  'MHN:CAT': -1,
  'MHN:SAC': -1,
  'SCI:CAT': -1,
  'SCI:SAC': -1,
  'PAT:CAT': -1,
  'PAT:SAC': -1,
  'REC:CAT': -1,
  'REC:SAC': -1,
  'CWH:CAT': -1,
  'CWH:SAC': -1,
};

/**
 * Get walking time between two buildings
 *
 * EDUCATIONAL NOTE - Hash Table Lookup:
 * We store times in "A:B" format and check both "A:B" and "B:A"
 * to handle the symmetric nature of walking times.
 *
 * @param fromBuilding - Source building code
 * @param toBuilding - Destination building code
 * @returns Walking time in minutes, -1 for cross-campus, 0 for same building
 */
export function getWalkingTime(fromBuilding: string, toBuilding: string): number {
  // Same building = no walking
  if (fromBuilding === toBuilding) {
    return 0;
  }

  // Normalize building codes
  const from = fromBuilding.toUpperCase();
  const to = toBuilding.toUpperCase();

  // Check both orderings (matrix is symmetric)
  const key1 = `${from}:${to}`;
  const key2 = `${to}:${from}`;

  if (key1 in WALKING_TIMES_RAW) {
    return WALKING_TIMES_RAW[key1];
  }
  if (key2 in WALKING_TIMES_RAW) {
    return WALKING_TIMES_RAW[key2];
  }

  // Unknown pair - estimate based on campus
  const fromBldg = CAMPUS_BUILDINGS[from];
  const toBldg = CAMPUS_BUILDINGS[to];

  if (!fromBldg || !toBldg) {
    // Unknown building(s)
    return 10; // Default estimate
  }

  // Cross-campus check
  if (fromBldg.campus !== toBldg.campus &&
      fromBldg.campus !== 'Online' && toBldg.campus !== 'Online' &&
      fromBldg.campus !== 'TBA' && toBldg.campus !== 'TBA') {
    return -1; // Cross-campus - not walkable
  }

  // Same campus but not in matrix - estimate based on distance
  if (fromBldg.campus === toBldg.campus) {
    const dx = fromBldg.mapPosition.x - toBldg.mapPosition.x;
    const dy = fromBldg.mapPosition.y - toBldg.mapPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // Rough conversion: 100 units ≈ 2 minutes walking
    return Math.ceil(distance / 50);
  }

  return 10; // Default fallback
}

/**
 * Check if walking between two buildings is feasible in the given time
 *
 * @param fromBuilding - Source building code
 * @param toBuilding - Destination building code
 * @param availableMinutes - Time available between classes
 * @returns Object with feasibility and details
 */
export function checkWalkingFeasibility(
  fromBuilding: string,
  toBuilding: string,
  availableMinutes: number
): {
  feasible: boolean;
  walkingMinutes: number;
  isCrossCampus: boolean;
  buffer: number;
  recommendation: string;
} {
  const walkingTime = getWalkingTime(fromBuilding, toBuilding);

  // Cross-campus check
  if (walkingTime === -1) {
    return {
      feasible: false,
      walkingMinutes: -1,
      isCrossCampus: true,
      buffer: 0,
      recommendation: 'Cross-campus classes require driving (~20 min). Consider scheduling on different days.',
    };
  }

  const buffer = availableMinutes - walkingTime;
  const feasible = buffer >= 0;

  let recommendation: string;
  if (buffer >= 10) {
    recommendation = 'Plenty of time to walk between classes.';
  } else if (buffer >= 5) {
    recommendation = 'Comfortable walk, but leave promptly.';
  } else if (buffer >= 0) {
    recommendation = 'Tight schedule. May need to leave class slightly early.';
  } else {
    recommendation = `Insufficient time. Need ${Math.abs(buffer)} more minutes between classes.`;
  }

  return {
    feasible,
    walkingMinutes: walkingTime,
    isCrossCampus: false,
    buffer,
    recommendation,
  };
}

/**
 * Get building info by code
 */
export function getBuilding(code: string): CampusBuilding | undefined {
  return CAMPUS_BUILDINGS[code.toUpperCase()];
}

/**
 * Get all buildings for a specific campus
 */
export function getBuildingsByCampus(campus: Campus): CampusBuilding[] {
  return Object.values(CAMPUS_BUILDINGS).filter((b) => b.campus === campus);
}

/**
 * Campus display names
 */
export const CAMPUS_NAMES: Record<Campus, string> = {
  Cheney: 'Cheney Campus',
  'Spokane U-District': 'Spokane University District',
  Online: 'Online',
  TBA: 'To Be Announced',
};

/**
 * Standard passing period between classes (in minutes)
 * EWU typically has 10 minutes between class periods
 */
export const STANDARD_PASSING_PERIOD = 10;

/**
 * Minimum recommended gap for comfortable walking
 */
export const MINIMUM_WALKING_BUFFER = 5;

/**
 * Get all building codes for validation
 */
export function getAllBuildingCodes(): string[] {
  return Object.keys(CAMPUS_BUILDINGS);
}

/**
 * Extract building code from a room string like "CEB 222" or "KGS 101A"
 */
export function extractBuildingCode(roomString: string): string | null {
  if (!roomString || roomString === 'TBA' || roomString === 'Online') {
    return roomString || null;
  }

  // Split on space and take first part
  const parts = roomString.trim().split(/\s+/);
  if (parts.length > 0) {
    const code = parts[0].toUpperCase();
    // Verify it's a known building or return as-is
    return code;
  }

  return null;
}
