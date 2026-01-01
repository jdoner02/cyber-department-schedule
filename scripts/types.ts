/**
 * TypeScript interfaces for Washington State salary data harvesting
 */

export interface EmployeeSalary {
  id: string;                    // Generated unique ID (hash of name + employer + year)
  name: string;                  // Employee name
  employer: 'UW' | 'EWU';        // Institution code
  employerFull: string;          // Full employer name
  department?: string;           // Department/unit name
  position: string;              // Job title
  salary: number;                // Annual salary (rounded to $100)
  year: number;                  // Calendar/fiscal year
  source: string;                // Data source identifier
  lastUpdated: string;           // ISO date string
}

export interface RawDataWaGovRecord {
  agency?: string;
  name?: string;
  job_title?: string;
  annual_salary?: string | number;
  calendar_year?: string | number;
  [key: string]: unknown;        // Allow for additional fields
}

export interface RawGovSalariesRecord {
  name: string;
  position: string;
  salary: number;
  employer: string;
  year: number;
}

export interface DataSource {
  id: string;
  name: string;
  url: string;
  type: 'api' | 'download' | 'scrape';
  format: string;
  lastFetched?: string;
  recordCount?: number;
  notes?: string;
}

export interface SocrataQueryParams {
  $select?: string;
  $where?: string;
  $order?: string;
  $limit?: number;
  $offset?: number;
}

export interface FetchResult {
  success: boolean;
  recordCount: number;
  source: string;
  timestamp: string;
  error?: string;
}
