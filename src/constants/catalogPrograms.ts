import type { DegreeProgram } from '../types/advising';

export type CatalogProgramMetadata = {
  slug: string;
  name: string;
  degreeType: DegreeProgram['degreeType'];
  includeInAdvising?: boolean;
};

export const CATALOG_PROGRAMS: CatalogProgramMetadata[] = [
  {
    slug: 'computer-science-cyber-operations-bs',
    name: 'Computer Science - Cyber Operations, BS',
    degreeType: 'BS',
    includeInAdvising: true,
  },
  {
    slug: 'computer-science-bs',
    name: 'Computer Science, BS',
    degreeType: 'BS',
    includeInAdvising: true,
  },
  {
    slug: 'computer-science-bcs',
    name: 'Computer Science, BCS',
    degreeType: 'BCS',
    includeInAdvising: true,
  },
  {
    slug: 'cyber-operations-bs',
    name: 'Cyber Operations, BS',
    degreeType: 'BS',
    includeInAdvising: true,
  },
  {
    slug: 'cybersecurity-minor',
    name: 'Cybersecurity Minor',
    degreeType: 'Minor',
    includeInAdvising: true,
  },
  {
    slug: 'computer-science-ms',
    name: 'Computer Science, MS',
    degreeType: 'MS',
    includeInAdvising: true,
  },
  {
    slug: 'electrical-engineering-bs',
    name: 'Electrical Engineering, BS',
    degreeType: 'BS',
    includeInAdvising: false,
  },
];

