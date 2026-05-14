/**
 * Genogram domain types (DSL v2 / McGoldrick-style)
 */

export type Gender = 'male' | 'female' | 'unknown';

export type Burden = 'mild' | 'moderate' | 'severe';

export type SupportLevel = 'good' | 'normal' | 'weak';

export type EconomicStatus = 'stable' | 'unstable';

export type ResourceType =
  | 'medical'
  | 'community'
  | 'school'
  | 'religion'
  | 'work'
  | 'other';

export type EcomapStrength = 'strong' | 'normal' | 'weak' | 'stressful';

export type EcomapDirection = 'in' | 'out' | 'both';

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  age?: number;
  role?: string;
  health?: string;
  mobility?: string;
  generation: number;
  note?: string;
  deceased?: boolean;
  deathYear?: number;
  isCase?: boolean;
  isPrimaryContact?: boolean;
  isCaregiver?: boolean;
}

export interface ExternalResource {
  id: string;
  name: string;
  resourceType: ResourceType;
  strength: EcomapStrength;
}

export type MaritalKind = 'marriage' | 'divorce' | 'cohabit';

export interface MaritalRelation {
  kind: MaritalKind;
  a: string;
  b: string;
}

export interface ChildrenRelation {
  parents: [string, string] | [string];
  kids: string[];
}

export interface Household {
  members: string[];
}

export interface NearbyHousehold {
  a: string[];
  b: string[];
}

export interface CaregiverRelation {
  from: string;
  to: string;
  burden?: Burden;
}

export interface Miscarriage {
  parents: [string, string];
  year?: number;
}

export interface Stillbirth {
  parents: [string, string];
  year?: number;
}

export interface EcomapLink {
  person: string;
  resource: string;
  strength: EcomapStrength;
  direction: EcomapDirection;
}

export interface FamilyMeta {
  supportLevel?: SupportLevel;
  economicStatus?: EconomicStatus;
}

/** Parsed AST from DSL */
export interface GenogramAST {
  people: Map<string, Person>;
  resources: Map<string, ExternalResource>;
  marital: MaritalRelation[];
  children: ChildrenRelation[];
  households: Household[];
  nearbyHouseholds: NearbyHousehold[];
  caregivers: CaregiverRelation[];
  primaryContact?: string;
  miscarriages: Miscarriage[];
  stillbirths: Stillbirth[];
  ecomap: EcomapLink[];
  family: FamilyMeta;
  errors: ParseError[];
}

export interface ParseError {
  line: number;
  message: string;
}
