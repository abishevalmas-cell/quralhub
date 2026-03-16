#!/usr/bin/env node
/**
 * Auto-check MRP/MZP values from official sources
 * Source: egov.kz, adilet.zan.kz, nationalbank.kz
 *
 * Run: npm run update-mrp
 * Schedule: January + July via GitHub Actions
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

// Known MRP/MZP — update these when confirmed
const EXPECTED = {
  2025: { MRP: 3932, MZP: 85000 },
  2026: { MRP: 4325, MZP: 85000 },
};

const SOURCES = [
  'https://egov.kz/cms/ru/articles/economics/mrp',
  'https://online.zakon.kz/Document/?doc_id=30006254', // Tax code
];

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Quralhub/2.0' },
      timeout: 15000,
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchURL(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

async function main() {
  const year = new Date().getFullYear();
  const expected = EXPECTED[year];

  console.log(`[MRP] Checking MRP/MZP for ${year}...`);
  if (expected) {
    console.log(`[MRP] Expected: MRP = ${expected.MRP}₸, MZP = ${expected.MZP}₸`);
  }

  // Check constants.ts
  const constFile = path.join(__dirname, '..', 'lib', 'constants.ts');
  const constContent = fs.readFileSync(constFile, 'utf8');
  const mrpMatch = constContent.match(/MRP\s*=\s*(\d+)/);
  const mzpMatch = constContent.match(/MZP\s*=\s*(\d+)/);

  const currentMRP = mrpMatch ? parseInt(mrpMatch[1]) : 0;
  const currentMZP = mzpMatch ? parseInt(mzpMatch[1]) : 0;

  console.log(`[MRP] Current in code: MRP = ${currentMRP}₸, MZP = ${currentMZP}₸`);

  if (expected) {
    if (currentMRP !== expected.MRP) {
      console.error(`[MRP] ⚠️ MRP MISMATCH! Code: ${currentMRP}, Expected: ${expected.MRP}`);
    } else {
      console.log('[MRP] ✅ MRP is up to date');
    }
    if (currentMZP !== expected.MZP) {
      console.error(`[MRP] ⚠️ MZP MISMATCH! Code: ${currentMZP}, Expected: ${expected.MZP}`);
    } else {
      console.log('[MRP] ✅ MZP is up to date');
    }
  }

  // Try fetching egov page
  for (const url of SOURCES) {
    try {
      const html = await fetchURL(url);
      const mrpMatches = html.match(/МРП[^]*?(\d[\s\d]*\d)\s*тенге/i);
      if (mrpMatches) {
        const found = parseInt(mrpMatches[1].replace(/\s/g, ''));
        console.log(`[MRP] Found on web: MRP = ${found}₸ (source: ${url})`);
      }
    } catch (e) {
      console.warn(`[MRP] Cannot fetch ${url}: ${e.message}`);
    }
  }
}

main().catch(err => {
  console.error('[MRP] Fatal:', err.message);
  process.exit(1);
});
