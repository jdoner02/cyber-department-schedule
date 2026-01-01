import type { ScheduleTrendsDataset } from '../types/trends';

const TRENDS_PATH = 'data/trends/schedule-trends.json';

export async function loadScheduleTrendsFromPublic(): Promise<ScheduleTrendsDataset> {
  const basePath = import.meta.env.BASE_URL || '/';
  const url = `${basePath}${TRENDS_PATH}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load trends dataset (${response.status})`);
  }
  return (await response.json()) as ScheduleTrendsDataset;
}

