import { createTerm } from '../constants/academicTerms';
import type { AcademicQuarter } from '../constants/academicTerms';
import type { AcademicTerm } from '../types/advising';

export type AcademicCalendarCategory =
  | 'Registration'
  | 'Instruction Dates'
  | 'Federal Holidays'
  | 'Tuition & Fees'
  | 'Finals'
  | 'Grades'
  | 'Commencement'
  | string;

export type AcademicCalendarTermLabel = 'Winter' | 'Spring' | 'Summer' | 'Fall' | 'No Classes' | string;

export interface AcademicCalendarEvent {
  id: string;
  title: string;
  link: string | null;
  startDate: string; // ISO 8601
  termLabel: AcademicCalendarTermLabel | null;
  termCode: AcademicTerm | null;
  category: AcademicCalendarCategory | null;
  descriptionHtml: string | null;
}

export type AcademicCalendarTimeframe = 'today' | 'tomorrow' | 'week' | 'month' | 'term';

export interface AcademicCalendarFeedResult {
  events: AcademicCalendarEvent[];
  lastBuildDate: string | null;
}

const RSS_FEED_PATH = 'data/academic-calendar-quarter.rss';

const TERM_LABEL_TO_QUARTER: Record<string, AcademicQuarter> = {
  winter: 'winter',
  spring: 'spring',
  summer: 'summer',
  fall: 'fall',
};

export async function loadAcademicCalendarFromPublicRss(): Promise<AcademicCalendarFeedResult> {
  const basePath = import.meta.env.BASE_URL || '/';
  const url = `${basePath}${RSS_FEED_PATH}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load academic calendar RSS (${response.status})`);
  }
  const rssText = await response.text();
  return parseAcademicCalendarRss(rssText);
}

export function parseAcademicCalendarRss(rssText: string): AcademicCalendarFeedResult {
  const cleaned = rssText.replace(/^\uFEFF/, '');
  const doc = new DOMParser().parseFromString(cleaned, 'application/xml');

  const parserErrors = doc.getElementsByTagName('parsererror');
  if (parserErrors.length > 0) {
    throw new Error('Invalid academic calendar RSS XML');
  }

  const channel = doc.getElementsByTagName('channel')[0] ?? null;
  const lastBuildDate = channel?.getElementsByTagName('lastBuildDate')[0]?.textContent?.trim() ?? null;

  const items = Array.from(doc.getElementsByTagName('item'));
  const events = items
    .map(parseRssItem)
    .filter((e): e is AcademicCalendarEvent => e !== null)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return { events, lastBuildDate };
}

function parseRssItem(item: Element): AcademicCalendarEvent | null {
  const title = item.getElementsByTagName('title')[0]?.textContent?.trim() ?? '';
  const link = item.getElementsByTagName('link')[0]?.textContent?.trim() ?? null;
  const guid = item.getElementsByTagName('guid')[0]?.textContent?.trim() ?? null;
  const pubDateText = item.getElementsByTagName('pubDate')[0]?.textContent?.trim() ?? null;
  const descriptionHtmlRaw = item.getElementsByTagName('description')[0]?.textContent ?? null;

  const startDate = parsePubDate(pubDateText);
  if (!startDate) return null;

  const descriptionHtml = descriptionHtmlRaw ? normalizeHtmlEntities(descriptionHtmlRaw) : null;
  const termLabel =
    descriptionHtml ? (extractLabeledValue(descriptionHtml, 'Calendar - Quarter Term') ?? null) : null;
  const category =
    descriptionHtml ? (extractLabeledValue(descriptionHtml, 'Academic Calendar - Category') ?? null) : null;

  const termCode = inferTermCode({ termLabel, startDate });

  return {
    id: guid ?? `${title}-${startDate.toISOString()}`,
    title,
    link,
    startDate: startDate.toISOString(),
    termLabel,
    termCode,
    category,
    descriptionHtml,
  };
}

function parsePubDate(pubDateText: string | null): Date | null {
  if (!pubDateText) return null;
  const date = new Date(pubDateText);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function normalizeHtmlEntities(html: string): string {
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractLabeledValue(html: string, label: string): string | null {
  const normalized = html.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ');
  const pattern = new RegExp(`<b>\\s*${escapeRegExp(label)}\\s*<\\/b>\\s*:\\s*([^<\\n\\r]+)`, 'i');
  const match = normalized.match(pattern);
  if (!match) return null;
  return match[1].replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ').trim();
}

function inferTermCode({
  termLabel,
  startDate,
}: {
  termLabel: string | null;
  startDate: Date;
}): AcademicTerm | null {
  if (!termLabel) return null;
  const quarter = TERM_LABEL_TO_QUARTER[termLabel.trim().toLowerCase()];
  if (!quarter) return null;

  const dateYear = startDate.getFullYear();
  const monthIndex = startDate.getMonth(); // 0 = Jan

  // Winter quarter events can occur in Sep-Dec of the prior calendar year.
  const termYear = quarter === 'winter' && monthIndex >= 8 ? dateYear + 1 : dateYear;

  return createTerm(termYear, quarter);
}

export function getEventsForTimeframe({
  events,
  now,
  timeframe,
  focusedTermCode,
}: {
  events: AcademicCalendarEvent[];
  now: Date;
  timeframe: AcademicCalendarTimeframe;
  focusedTermCode: AcademicTerm | null;
}): AcademicCalendarEvent[] {
  if (timeframe === 'term') {
    if (!focusedTermCode) return [];
    return events.filter((e) => e.termCode === focusedTermCode);
  }

  const { start, end } = getLocalDateRange(now, timeframe);
  return events.filter((event) => {
    const date = new Date(event.startDate);
    const ts = date.getTime();
    return ts >= start.getTime() && ts <= end.getTime();
  });
}

export function findRegistrationOpensEvent(
  events: AcademicCalendarEvent[],
  termCode: AcademicTerm
): AcademicCalendarEvent | null {
  const registrationEvents = events
    .filter((e) => e.termCode === termCode)
    .filter((e) => (e.category ?? '').toLowerCase() === 'registration')
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const likelyStartEvents = registrationEvents.filter((event) =>
    /(priority registration|general registration|registration begins|new student registration begins)/i.test(event.title)
  );

  return likelyStartEvents[0] ?? registrationEvents[0] ?? null;
}

export interface PriorityRegistrationWindow {
  minCredits: number;
  maxCredits: number | null;
  event: AcademicCalendarEvent;
}

export function getPriorityRegistrationWindowsForTerm(
  events: AcademicCalendarEvent[],
  termCode: AcademicTerm
): PriorityRegistrationWindow[] {
  return events
    .filter((e) => e.termCode === termCode)
    .filter((e) => (e.category ?? '').toLowerCase() === 'registration')
    .map((event) => {
      const parsed = parsePriorityRegistrationCredits(event.title);
      if (!parsed) return null;
      return { ...parsed, event };
    })
    .filter((w): w is PriorityRegistrationWindow => w !== null)
    .sort((a, b) => new Date(a.event.startDate).getTime() - new Date(b.event.startDate).getTime());
}

export function findRegistrationDateForEarnedCredits({
  windows,
  earnedCredits,
}: {
  windows: PriorityRegistrationWindow[];
  earnedCredits: number;
}): PriorityRegistrationWindow | null {
  for (const window of windows) {
    const maxOk = window.maxCredits === null ? true : earnedCredits <= window.maxCredits;
    if (earnedCredits >= window.minCredits && maxOk) return window;
  }
  return null;
}

function parsePriorityRegistrationCredits(
  title: string
): { minCredits: number; maxCredits: number | null } | null {
  const plusMatch = title.match(/Priority Registration for (\d+)\+\s*Earned Credits/i);
  if (plusMatch) {
    return { minCredits: parseInt(plusMatch[1], 10), maxCredits: null };
  }

  const orMoreMatch = title.match(/Priority Registration for (\d+)\s+or\s+More\s+Earned Credits/i);
  if (orMoreMatch) {
    return { minCredits: parseInt(orMoreMatch[1], 10), maxCredits: null };
  }

  const rangeMatch = title.match(/Priority Registration for (\d+)\s*[-–]\s*(\d+)\s*Earned Credits/i);
  if (rangeMatch) {
    return { minCredits: parseInt(rangeMatch[1], 10), maxCredits: parseInt(rangeMatch[2], 10) };
  }

  return null;
}

function getLocalDateRange(now: Date, timeframe: Exclude<AcademicCalendarTimeframe, 'term'>): { start: Date; end: Date } {
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  if (timeframe === 'today') {
    return { start: startOfDay(now), end: endOfDay(now) };
  }

  if (timeframe === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return { start: startOfDay(tomorrow), end: endOfDay(tomorrow) };
  }

  if (timeframe === 'week') {
    // "This week" = Monday -> Sunday in local time
    const day = now.getDay(); // 0=Sun
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: startOfDay(monday), end: endOfDay(sunday) };
  }

  // month
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}
