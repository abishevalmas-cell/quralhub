#!/usr/bin/env node
/**
 * Auto-update telecom tariffs from operator APIs/pages
 * Sources:
 *  - kcell.kz/tariffs
 *  - beeline.kz/tariffs
 *  - tele2.kz/tariffs
 *  - altel.kz/tariffs
 *
 * Run: npm run update-telecom
 * Schedule: Monthly via GitHub Actions
 */
const https = require('https');

const OPERATOR_PAGES = [
  { name: 'Kcell', url: 'https://www.kcell.kz/ru/tariffs' },
  { name: 'Beeline', url: 'https://beeline.kz/ru/mobile/tariffs' },
  { name: 'Tele2', url: 'https://tele2.kz/tariffs' },
  { name: 'Altel', url: 'https://altel.kz/tariffs' },
];

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Quralhub/2.0' },
      timeout: 15000,
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

async function checkOperator(op) {
  try {
    const res = await fetchURL(op.url);
    const hasPrice = /\d[\s]?\d{3}[\s]?₸/.test(res.data) || /тенге|tenge|₸/i.test(res.data);
    console.log(`  ${op.name}: HTTP ${res.status}, tariff data: ${hasPrice ? 'YES' : 'NO'}, size: ${(res.data.length / 1024).toFixed(0)}KB`);
    return { name: op.name, status: res.status, hasTariffs: hasPrice };
  } catch (e) {
    console.log(`  ${op.name}: FAILED — ${e.message}`);
    return { name: op.name, status: 0, hasTariffs: false };
  }
}

async function main() {
  console.log('[TELECOM] Checking operator tariff pages...\n');
  const results = [];
  for (const op of OPERATOR_PAGES) {
    results.push(await checkOperator(op));
  }

  const accessible = results.filter(r => r.status === 200);
  console.log(`\n[TELECOM] ${accessible.length}/${OPERATOR_PAGES.length} pages accessible`);
  console.log('[TELECOM] Full auto-parsing requires site-specific scrapers.');
  console.log('[TELECOM] Manual review recommended for tariff changes.');
}

main().catch(err => {
  console.error('[TELECOM] Fatal:', err.message);
  process.exit(1);
});
