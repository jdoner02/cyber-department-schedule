import { describe, it, expect } from 'vitest';
import { findRegistrationOpensEvent, getPriorityRegistrationWindowsForTerm, parseAcademicCalendarRss } from './academicCalendar';

describe('academicCalendar', () => {
  it('parses RSS and infers term codes (including winter cross-year)', () => {
    const rss = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <lastBuildDate>01 Jan 2026 00:00:00 GMT</lastBuildDate>
    <item>
      <title>Priority Registration for Special Populations</title>
      <description>Monday, February 23, 2026 &lt;br/&gt;&lt;br/&gt;&lt;b&gt;Calendar - Quarter Term&lt;/b&gt;:&amp;nbsp;Spring &lt;br/&gt;&lt;b&gt;Academic Calendar - Category&lt;/b&gt;:&amp;nbsp;Registration</description>
      <link>https://example.com/event1</link>
      <pubDate>23 Feb 2026 16:00:00 GMT</pubDate>
      <guid isPermaLink="false">event-1</guid>
    </item>
    <item>
      <title>Priority Registration for 0-29 Earned Credits</title>
      <description>Wednesday, March 4, 2026 &lt;br/&gt;&lt;br/&gt;&lt;b&gt;Calendar - Quarter Term&lt;/b&gt;:&amp;nbsp;Spring &lt;br/&gt;&lt;b&gt;Academic Calendar - Category&lt;/b&gt;:&amp;nbsp;Registration</description>
      <link>https://example.com/event2</link>
      <pubDate>04 Mar 2026 16:00:00 GMT</pubDate>
      <guid isPermaLink="false">event-2</guid>
    </item>
    <item>
      <title>Priority Registration for 180+ Earned Credits</title>
      <description>Monday, November 10, 2025 &lt;br/&gt;&lt;br/&gt;&lt;b&gt;Calendar - Quarter Term&lt;/b&gt;:&amp;nbsp;Winter &lt;br/&gt;&lt;b&gt;Academic Calendar - Category&lt;/b&gt;:&amp;nbsp;Registration</description>
      <link>https://example.com/event3</link>
      <pubDate>10 Nov 2025 16:00:00 GMT</pubDate>
      <guid isPermaLink="false">event-3</guid>
    </item>
  </channel>
</rss>`;

    const { events, lastBuildDate } = parseAcademicCalendarRss(rss);

    expect(lastBuildDate).toBe('01 Jan 2026 00:00:00 GMT');
    expect(events).toHaveLength(3);

    const springEvents = events.filter((e) => e.termCode === '202620');
    expect(springEvents).toHaveLength(2);

    const winterEvent = events.find((e) => e.id === 'event-3');
    expect(winterEvent?.termCode).toBe('202610');
  });

  it('finds earliest registration event for a term', () => {
    const rss = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>General Registration</title>
      <description>Thursday, March 5, 2026 &lt;br/&gt;&lt;br/&gt;&lt;b&gt;Calendar - Quarter Term&lt;/b&gt;:&amp;nbsp;Spring &lt;br/&gt;&lt;b&gt;Academic Calendar - Category&lt;/b&gt;:&amp;nbsp;Registration</description>
      <pubDate>05 Mar 2026 16:00:00 GMT</pubDate>
      <guid isPermaLink="false">event-a</guid>
    </item>
    <item>
      <title>Priority Registration</title>
      <description>Monday, February 23, 2026 &lt;br/&gt;&lt;br/&gt;&lt;b&gt;Calendar - Quarter Term&lt;/b&gt;:&amp;nbsp;Spring &lt;br/&gt;&lt;b&gt;Academic Calendar - Category&lt;/b&gt;:&amp;nbsp;Registration</description>
      <pubDate>23 Feb 2026 16:00:00 GMT</pubDate>
      <guid isPermaLink="false">event-b</guid>
    </item>
  </channel>
</rss>`;

    const { events } = parseAcademicCalendarRss(rss);
    const opens = findRegistrationOpensEvent(events, '202620');

    expect(opens?.id).toBe('event-b');
  });

  it('parses priority registration credit ranges', () => {
    const rss = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Priority Registration for 0-29 Earned Credits</title>
      <description>Wednesday, March 4, 2026 &lt;br/&gt;&lt;br/&gt;&lt;b&gt;Calendar - Quarter Term&lt;/b&gt;:&amp;nbsp;Spring &lt;br/&gt;&lt;b&gt;Academic Calendar - Category&lt;/b&gt;:&amp;nbsp;Registration</description>
      <pubDate>04 Mar 2026 16:00:00 GMT</pubDate>
      <guid isPermaLink="false">event-1</guid>
    </item>
    <item>
      <title>Priority Registration for 180+ Earned Credits</title>
      <description>Tuesday, March 3, 2026 &lt;br/&gt;&lt;br/&gt;&lt;b&gt;Calendar - Quarter Term&lt;/b&gt;:&amp;nbsp;Spring &lt;br/&gt;&lt;b&gt;Academic Calendar - Category&lt;/b&gt;:&amp;nbsp;Registration</description>
      <pubDate>03 Mar 2026 16:00:00 GMT</pubDate>
      <guid isPermaLink="false">event-2</guid>
    </item>
  </channel>
</rss>`;

    const { events } = parseAcademicCalendarRss(rss);
    const windows = getPriorityRegistrationWindowsForTerm(events, '202620');

    expect(windows).toHaveLength(2);
    expect(windows.find((w) => w.minCredits === 0 && w.maxCredits === 29)).toBeTruthy();
    expect(windows.find((w) => w.minCredits === 180 && w.maxCredits === null)).toBeTruthy();
  });
});
