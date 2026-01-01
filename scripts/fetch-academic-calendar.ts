import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const RSS_URL = 'https://25livepub.collegenet.com/calendars/academic-calendar-quarter.rss';
const OUTPUT_PATH = 'public/data/academic-calendar-quarter.rss';

async function main() {
  const response = await fetch(RSS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch calendar RSS: HTTP ${response.status} ${response.statusText}`);
  }

  const rssText = await response.text();

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, rssText, 'utf8');

  console.log(`Saved academic calendar RSS to ${OUTPUT_PATH} (${rssText.length} chars)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

