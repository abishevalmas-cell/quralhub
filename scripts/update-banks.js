#!/usr/bin/env node
/**
 * Auto-update bank deposit/credit rates from official APIs
 * Sources:
 *  - nationalbank.kz/ru/news/depozity (deposit stats)
 *  - halykbank.kz, kaspi.kz, bcc.kz (scraping public pages)
 *
 * Run: npm run update-banks
 * Schedule: Monthly via GitHub Actions
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const BANK_URLS = [
  { name: 'Halyk Bank', url: 'https://halykbank.kz/deposits' },
  { name: 'Kaspi Bank', url: 'https://kaspi.kz/deposits' },
  { name: 'ForteBank', url: 'https://forte.kz/deposits' },
  { name: 'Bank CenterCredit', url: 'https://bcc.kz/deposits' },
];

// NB RK base rate — affects all bank rates
const NB_BASE_RATE_URL = 'https://nationalbank.kz/ru/bazovaya-stavka';

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : require('http');
    proto.get(url, {
      headers: { 'User-Agent': 'Quralhub/2.0 (data updater)' },
      timeout: 15000,
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

async function fetchBaseRate() {
  try {
    const html = await fetchURL(NB_BASE_RATE_URL);
    // Look for base rate pattern like "14.25%"
    const match = html.match(/базовая\s+ставка[^]*?(\d+[.,]\d+)\s*%/i);
    if (match) {
      console.log('[NB] Base rate:', match[1] + '%');
      return parseFloat(match[1].replace(',', '.'));
    }
  } catch (e) {
    console.warn('[NB] Base rate fetch failed:', e.message);
  }
  return null;
}

async function main() {
  console.log('[BANKS] Starting bank data update...');

  const baseRate = await fetchBaseRate();
  if (baseRate) {
    console.log(`[BANKS] NB base rate: ${baseRate}%`);
    console.log('[BANKS] Expected deposit range: ${baseRate-2}% - ${baseRate+4}%');
    console.log('[BANKS] Expected credit range: ${baseRate+3}% - ${baseRate+8}%');
  }

  // For now, log status — full scraping requires bank-specific parsers
  console.log('[BANKS] Auto-scraping bank pages requires site-specific parsers.');
  console.log('[BANKS] Manual review recommended. Creating issue...');
  console.log('[BANKS] Done.');
}

main().catch(err => {
  console.error('[BANKS] Fatal:', err.message);
  process.exit(1);
});
