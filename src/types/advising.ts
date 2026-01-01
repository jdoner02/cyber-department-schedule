/**
 * =============================================================================
 * STUDENT ADVISING SYSTEM TYPES
 * =============================================================================
 *
 * This file defines the data model for the Student Advising System.
 * Following MVC pattern: These are the "Model" types that represent
 * the core business entities.
 *
 * EDUCATIONAL NOTE: TypeScript interfaces define "shapes" of data.
 * They provide compile-time type checking without runtime overhead.
 * Unlike classes, interfaces are purely for type definitions and
 * don't generate any JavaScript code.
 *
 * DESIGN PATTERN: Value Objects
 * Most types here are immutable value objects - they represent data
 * rather than entities with identity. This makes state management
 * easier and enables efficient React rendering through shallow comparison.
 *
 * =============================================================================
 */

// =============================================================================
// ICON AND VISUAL TYPES
// =============================================================================

/**
 * Emoji options for student personas
 *
 * PRIVACY NOTE: We use generic emojis instead of names or custom icons
 * to discourage storing identifiable information. This makes the
 * system safe for use on public GitHub Pages deployments.
 *
 * Personas are auto-named "Student 1", "Student 2", etc. to further
 * prevent accidental storage of real student information.
 *
 * EDUCATIONAL NOTE: Using string literal unions instead of enums
 * provides better type inference and tree-shaking in bundlers.
 */
export type PersonaEmoji =
  | '🎓'  // Graduation cap - academic
  | '🔐'  // Lock - cybersecurity
  | '💻'  // Laptop - CS student
  | '🛡️'  // Shield - security focus
  | '🚀'  // Rocket - ambitious
  | '⭐'  // Star - standout
  | '📚'  // Books - studious
  | '🔷'  // Blue diamond - neutral
  | '🟢'  // Green circle - on track
  | '🟡'  // Yellow circle - caution
  | '🔴'  // Red circle - needs attention
  | '👤'; // Person silhouette - default

// Legacy alias for backwards compatibility
export type PersonaIcon = PersonaEmoji;

// =============================================================================
// ACADEMIC TERM TYPES
// =============================================================================

/**
 * Academic term code format: YYYYQQ
 *
 * Where:
 * - YYYY = 4-digit year
 * - QQ = Quarter code: 10=Fall, 20=Winter, 30=Spring, 40=Summer
 *
 * Example: "202510" = Fall 2025
 *
 * EDUCATIONAL NOTE: We use a string type alias rather than a branded type
 * for simplicity. In production, you might use a branded type for stronger
 * type safety: type AcademicTerm = string & { readonly __brand: 'AcademicTerm' }
 */
export type AcademicTerm = string;

/**
 * Quarter within an academic year
 */
export type Quarter = 'fall' | 'winter' | 'spring' | 'summer';

/**
 * Academic standing based on credit hours completed
 *
 * EWU thresholds:
 * - Freshman: 0-44 credits
 * - Sophomore: 45-89 credits
 * - Junior: 90-134 credits
 * - Senior: 135+ credits
 * - Graduate: Post-baccalaureate
 */
export type AcademicStanding =
  | 'freshman'
  | 'sophomore'
  | 'junior'
  | 'senior'
  | 'graduate';

// =============================================================================
// GRADE TYPES
// =============================================================================

/**
 * Letter grades with plus/minus variants
 *
 * Includes special codes:
 * - W: Withdrawal (no GPA impact)
 * - IP: In Progress (current enrollment)
 * - P/NP: Pass/No Pass grading
 * - I: Incomplete
 * - TR: Transfer credit
 *
 * EDUCATIONAL NOTE: Grade points for GPA calculation:
 * A=4.0, A-=3.7, B+=3.3, B=3.0, B-=2.7, C+=2.3, C=2.0, C-=1.7, D+=1.3, D=1.0, D-=0.7, F=0.0
 */
export type LetterGrade =
  | 'A' | 'A-'
  | 'B+' | 'B' | 'B-'
  | 'C+' | 'C' | 'C-'
  | 'D+' | 'D' | 'D-'
  | 'F'
  | 'W'    // Withdrawal
  | 'IP'   // In Progress
  | 'P'    // Pass (P/NP grading)
  | 'NP'   // No Pass
  | 'I'    // Incomplete
  | 'TR';  // Transfer

/**
 * Grade point values for GPA calculation
 *
 * EDUCATIONAL NOTE: This is a lookup table (dictionary/map pattern)
 * for O(1) grade-to-points conversion.
 */
export const GRADE_POINTS: Record<LetterGrade, number | null> = {
  'A': 4.0,
  'A-': 3.7,
  'B+': 3.3,
  'B': 3.0,
  'B-': 2.7,
  'C+': 2.3,
  'C': 2.0,
  'C-': 1.7,
  'D+': 1.3,
  'D': 1.0,
  'D-': 0.7,
  'F': 0.0,
  'W': null,   // No GPA impact
  'IP': null,  // No GPA impact yet
  'P': null,   // No GPA impact
  'NP': null,  // No GPA impact
  'I': null,   // No GPA impact
  'TR': null,  // Handled separately
};

// =============================================================================
// COURSE COMPLETION TYPES
// =============================================================================

/**
 * A course that a student has taken or is planning to take
 *
 * EDUCATIONAL NOTE: This is a "record" type - it represents a single
 * row in what would be a relational database table of course completions.
 */
export interface CompletedCourse {
  /** Course identifier (e.g., "CSCD 210") */
  courseCode: string;

  /** Term when course was/will be taken */
  term: AcademicTerm;

  /** Grade received (null if in progress or planned) */
  grade: LetterGrade | null;

  /** Credits earned */
  credits: number;

  /** Whether this is a transfer credit from another institution */
  isTransfer: boolean;

  /** Optional notes (e.g., "Retaking for better grade") */
  notes?: string;
}

// =============================================================================
// STUDENT PERSONA TYPES
// =============================================================================

/**
 * Student persona - represents a hypothetical student for advising
 *
 * PRIVACY NOTE: These are FICTIONAL personas for planning purposes only.
 * Never store real student information (names, IDs, etc.) in this system.
 * This enables FERPA compliance by avoiding PII storage entirely.
 *
 * EDUCATIONAL NOTE: This is an "entity" type with identity (the `id` field).
 * Unlike value objects, entities are identified by their ID, not their values.
 * Two personas with the same data but different IDs are different entities.
 */
export interface StudentPersona {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Display nickname (e.g., "Fall 2024 Freshman Plan", "Transfer Student A") */
  nickname: string;

  /** Selected icon for visual identification */
  icon: PersonaIcon;

  /** Primary major program slug (e.g., "computer-science-cyber-operations-bs") */
  primaryMajor: string;

  /** Optional second major program slug */
  secondMajor?: string;

  /** Minor program slugs */
  minors: string[];

  /** Starting term (when student began program) */
  startTerm: AcademicTerm;

  /** Expected graduation term */
  expectedGraduation: AcademicTerm;

  /** Courses taken with grades */
  completedCourses: CompletedCourse[];

  /** Courses currently enrolled in (course codes) */
  currentCourses: string[];

  /** Preferred campus for in-person classes */
  preferredCampus?: 'Cheney' | 'Spokane U-District';

  /** Maximum credits per quarter preference */
  maxCreditsPerQuarter?: number;

  /** Timestamp of creation (ISO 8601) */
  createdAt: string;

  /** Timestamp of last update (ISO 8601) */
  updatedAt: string;

  /** Custom notes about this persona */
  notes?: string;
}

// =============================================================================
// DEGREE PROGRAM TYPES
// =============================================================================

/**
 * Requirement types in a degree program
 *
 * EDUCATIONAL NOTE: This categorization follows typical university
 * degree audit systems. Each category has different rules for
 * substitutions and GPA calculations.
 */
export type RequirementType =
  | 'core'            // Required core courses (no substitutions)
  | 'major-required'  // Required for the major
  | 'major-elective'  // Elective within major (choose from list)
  | 'support'         // Supporting courses (math, science, etc.)
  | 'lab'             // Laboratory course (usually corequisite with lecture)
  | 'gen-ed'          // General education requirements
  | 'capstone';       // Capstone/senior project

/**
 * A single course requirement in a degree program
 *
 * EDUCATIONAL NOTE: This combines static catalog data (title, credits)
 * with dynamic scheduling hints (typicalQuarters, typicalCampuses).
 */
export interface CourseRequirement {
  /** Course code (e.g., "CSCD 210") */
  courseCode: string;

  /** Course title */
  title: string;

  /** Credit hours */
  credits: number;

  /** Requirement category */
  type: RequirementType;

  /** Prerequisite course codes */
  prerequisites: string[];

  /** Corequisite course codes (must take concurrently) */
  corequisites: string[];

  /** Minimum grade required (default: C) */
  minimumGrade: LetterGrade;

  /** Typical quarters offered (helps with planning) */
  typicalQuarters: Quarter[];

  /** Campus(es) where typically offered */
  typicalCampuses: ('Cheney' | 'Spokane U-District' | 'Online')[];

  /** Optional notes about the course */
  notes?: string;
}

/**
 * A group of courses where student must choose N from the list
 *
 * EDUCATIONAL NOTE: This models "pick N from M" requirements common
 * in degree programs (e.g., "Choose 3 from: CSCD 420, 427, 434, 437")
 */
export interface ElectiveGroup {
  /** Group identifier */
  id: string;

  /** Display name (e.g., "Cybersecurity Electives") */
  name: string;

  /** Description of the requirement */
  description: string;

  /** Number of courses required from this group */
  requiredCount: number;

  /** Minimum total credits required from this group */
  requiredCredits: number;

  /** Available course options */
  courses: CourseRequirement[];
}

/**
 * Quarter in a plan of study
 */
export interface PlanQuarter {
  /** Term label (e.g., "Fall Year 1", "Spring Year 3") */
  termLabel: string;

  /** Year number (1-4 for undergrad, 1-2 for grad) */
  year: number;

  /** Quarter within year */
  quarter: Quarter;

  /** Course codes for this quarter */
  courses: string[];

  /** Total credits this quarter */
  totalCredits: number;

  /** Notes about this quarter (e.g., "Can substitute MATH 225") */
  notes?: string;
}

/**
 * 4-year plan of study from the catalog
 */
export interface PlanOfStudy {
  /** Plan name/variant (e.g., "Standard Track", "Accelerated") */
  name: string;

  /** Quarters in sequence */
  quarters: PlanQuarter[];

  /** Total credits in the plan */
  totalCredits: number;

  /** Notes about the plan */
  notes?: string;
}

/**
 * Complete degree program definition
 *
 * EDUCATIONAL NOTE: This is the "schema" for a degree program,
 * parsed from the EWU catalog. It's static data that changes
 * only when the catalog is updated (typically annually).
 */
export interface DegreeProgram {
  /** URL slug (e.g., "computer-science-cyber-operations-bs") */
  slug: string;

  /** Display name (e.g., "Computer Science - Cyber Operations, BS") */
  name: string;

  /** Degree type */
  degreeType: 'BS' | 'BA' | 'BCS' | 'MS' | 'Minor' | 'Certificate';

  /** Department (e.g., "Computer Science & Electrical Engineering") */
  department: string;

  /** Total credits required for degree */
  totalCredits: number;

  /** Minimum cumulative GPA required */
  minimumGPA: number;

  /** Minimum major GPA required (if different) */
  minimumMajorGPA?: number;

  /** Required core courses */
  coreCourses: CourseRequirement[];

  /** Elective groups */
  electiveGroups: ElectiveGroup[];

  /** Supporting course requirements */
  supportCourses: CourseRequirement[];

  /** Special requirements (e.g., "Pass departmental exam") */
  specialRequirements: string[];

  /** 4-year plan of study (if available from catalog) */
  planOfStudy?: PlanOfStudy;

  /** Source URL from catalog */
  catalogUrl: string;

  /** Catalog year (e.g., "2024-2025") */
  catalogYear: string;

  /** When this data was scraped */
  lastUpdated: string;
}

// =============================================================================
// PREREQUISITE GRAPH TYPES
// =============================================================================

/**
 * Node in the prerequisite graph
 *
 * EDUCATIONAL NOTE: This is a node in a Directed Acyclic Graph (DAG).
 * The DAG structure ensures no circular dependencies (you can't have
 * A require B which requires A).
 *
 * Key metrics:
 * - depth: How many prerequisites deep this course is (0 = no prereqs)
 * - criticalPathLength: Longest chain from this course to a terminal course
 *
 * The critical path helps prioritize courses - courses with longer paths
 * should be taken earlier to avoid delaying graduation.
 */
export interface PrerequisiteNode {
  /** Course code */
  courseCode: string;

  /** Course title (for display) */
  title: string;

  /** Courses that must be taken before this one */
  prerequisites: string[];

  /** Courses that require this one as a prerequisite */
  dependents: string[];

  /** Depth in the prerequisite tree (0 = no prerequisites) */
  depth: number;

  /** Critical path length (longest chain from this course to end) */
  criticalPathLength: number;
}

/**
 * Complete prerequisite graph for analysis
 *
 * EDUCATIONAL NOTE: This graph enables:
 * 1. Topological sorting for course ordering
 * 2. Critical path analysis for graduation planning
 * 3. Cycle detection (should never occur in valid data)
 * 4. Visualization of course dependencies
 */
export interface PrerequisiteGraph {
  /** All nodes in the graph, keyed by course code */
  nodes: Map<string, PrerequisiteNode>;

  /** Courses with no prerequisites (entry points) */
  entryPoints: string[];

  /** Courses with no dependents (terminal courses) */
  terminalCourses: string[];

  /** Maximum depth of any chain */
  maxDepth: number;
}

// =============================================================================
// STUDENT SCHEDULE CONFLICT TYPES
// =============================================================================

/**
 * Types of schedule conflicts for students
 *
 * EDUCATIONAL NOTE: These are different from faculty conflicts!
 * Faculty conflicts = same instructor teaching two courses at same time
 * Student conflicts = courses a student NEEDS that conflict with each other
 */
export type StudentConflictType =
  | 'time-overlap'       // Two needed courses at same time
  | 'cross-campus'       // Back-to-back classes on different campuses
  | 'insufficient-gap'   // Not enough time to walk between classes
  | 'prerequisite'       // Trying to take course without prerequisites
  | 'corequisite';       // Missing required corequisite

/**
 * A schedule conflict specific to a student's plan
 */
export interface StudentScheduleConflict {
  /** Unique identifier */
  id: string;

  /** Type of conflict */
  type: StudentConflictType;

  /** Severity level */
  severity: 'error' | 'warning' | 'info';

  /** Courses involved in the conflict */
  courses: string[];

  /** Human-readable description */
  description: string;

  /** Suggested resolution */
  suggestion?: string;

  /** For time conflicts: the specific day and time */
  conflictTime?: {
    day: string;
    startTime: number; // minutes from midnight
    endTime: number;
  };

  /** For campus/walking conflicts: distance info */
  walkingInfo?: {
    fromBuilding: string;
    toBuilding: string;
    walkingMinutes: number;
    gapMinutes: number;
  };
}

// =============================================================================
// CAMPUS MAP TYPES
// =============================================================================

/**
 * Campus location type
 *
 * EDUCATIONAL NOTE: We include 'Online' and 'TBA' as special cases
 * to handle courses that don't have a physical location.
 */
export type Campus = 'Cheney' | 'Spokane U-District' | 'Online' | 'TBA';

/**
 * Building on campus
 *
 * EDUCATIONAL NOTE: The mapPosition uses a coordinate system
 * relative to our static SVG map. The viewBox is 1000x800 units.
 */
export interface CampusBuilding {
  /** Building code (e.g., "CEB", "KGS") */
  code: string;

  /** Full name */
  name: string;

  /** Campus location */
  campus: Campus;

  /** SVG coordinates for map display */
  mapPosition: { x: number; y: number };

  /** Description of the building */
  description?: string;
}

/**
 * Walking route between buildings
 */
export interface WalkingRoute {
  /** Origin building code */
  from: string;

  /** Destination building code */
  to: string;

  /** Walking time in minutes */
  minutes: number;

  /** Distance in feet (approximate) */
  distanceFeet?: number;

  /** Route notes (e.g., "through tunnel", "outdoor path") */
  notes?: string;
}

/**
 * Daily commute analysis for a student
 */
export interface CommuteAnalysis {
  /** Day of week */
  day: string;

  /** Total walking time in minutes */
  totalWalkingMinutes: number;

  /** Number of cross-campus transitions (error condition) */
  crossCampusTransitions: number;

  /** Individual transitions between classes */
  transitions: {
    from: string;         // Building/location
    to: string;           // Building/location
    walkingMinutes: number;
    gapMinutes: number;   // Time between classes
    isTight: boolean;     // Less than walking time + 5 min buffer
  }[];

  /** Overall severity assessment */
  severity: 'ok' | 'warning' | 'error';
}

// =============================================================================
// GRADUATION PLANNING TYPES
// =============================================================================

/**
 * Status of a course in graduation planning
 *
 * EDUCATIONAL NOTE: This is a state machine with clear transitions:
 * - blocked -> available (when prerequisites completed)
 * - available -> scheduled (when added to future quarter)
 * - scheduled -> in-progress (when quarter begins)
 * - in-progress -> completed (when grade received)
 */
export type CourseStatus =
  | 'completed'        // Already taken with passing grade
  | 'in-progress'      // Currently enrolled
  | 'scheduled'        // Planned for future quarter
  | 'available'        // Prerequisites met, can take
  | 'blocked'          // Prerequisites not met
  | 'not-offered';     // Not offered in planned term

/**
 * A course with its status for a specific student
 */
export interface StudentCourseStatus {
  /** Course requirement details */
  requirement: CourseRequirement;

  /** Current status */
  status: CourseStatus;

  /** If completed, the grade */
  grade?: LetterGrade;

  /** If completed/in-progress/scheduled, the term */
  term?: AcademicTerm;

  /** Missing prerequisites (if blocked) */
  missingPrerequisites?: string[];

  /** Earliest term this can be taken */
  earliestAvailable?: AcademicTerm;

  /** Any conflicts with other scheduled courses */
  conflicts?: StudentScheduleConflict[];
}

/**
 * Suggested schedule for a single quarter
 */
export interface QuarterPlan {
  /** Term code */
  term: AcademicTerm;

  /** Display label (e.g., "Winter 2026") */
  termLabel: string;

  /** Courses to take */
  courses: StudentCourseStatus[];

  /** Total credits */
  totalCredits: number;

  /** Conflicts in this quarter */
  conflicts: StudentScheduleConflict[];

  /** Warnings/notes */
  warnings: string[];

  /** Is this quarter locked (user confirmed)? */
  isLocked?: boolean;
}

/**
 * Complete graduation plan
 *
 * EDUCATIONAL NOTE: This is the output of the graduation planning
 * algorithm. It represents one possible path to graduation, not
 * necessarily the only one or the optimal one.
 */
export interface GraduationPlan {
  /** Student persona this plan is for */
  personaId: string;

  /** Degree program */
  programSlug: string;

  /** Remaining quarters to graduation */
  quartersRemaining: number;

  /** Quarter-by-quarter plan */
  quarterPlans: QuarterPlan[];

  /** Summary statistics */
  summary: {
    totalCreditsRemaining: number;
    creditsCompleted: number;
    currentGPA: number | null;
    projectedGPA: number | null;
    estimatedGraduation: AcademicTerm;
    onTrack: boolean;
    bottleneckCourses: string[]; // Courses that could delay graduation
  };

  /** Any issues that prevent graduation */
  blockers: string[];

  /** Generated timestamp */
  generatedAt: string;
}

// =============================================================================
// STATE MANAGEMENT TYPES
// =============================================================================

/**
 * Actions for StudentContext reducer
 *
 * EDUCATIONAL NOTE: This follows the Redux/useReducer pattern.
 * Each action is a discriminated union member with a type field.
 * TypeScript can narrow the type based on the type field.
 */
export type StudentAction =
  | { type: 'ADD_PERSONA'; payload: StudentPersona }
  | { type: 'UPDATE_PERSONA'; payload: StudentPersona }
  | { type: 'DELETE_PERSONA'; payload: string } // payload is persona ID
  | { type: 'ADD_COMPLETED_COURSE'; payload: { personaId: string; course: CompletedCourse } }
  | { type: 'UPDATE_COURSE'; payload: { personaId: string; courseCode: string; updates: Partial<CompletedCourse> } }
  | { type: 'REMOVE_COURSE'; payload: { personaId: string; courseCode: string } }
  | { type: 'SET_CURRENT_COURSES'; payload: { personaId: string; courses: string[] } }
  | { type: 'LOAD_STATE'; payload: StudentPersona[] }
  | { type: 'CLEAR_ALL' };

/**
 * State shape for StudentContext
 */
export interface StudentState {
  /** All student personas */
  personas: StudentPersona[];

  /** Currently selected persona ID (if any) */
  selectedPersonaId: string | null;

  /** Is data loading? */
  loading: boolean;

  /** Last error message */
  error: string | null;
}
