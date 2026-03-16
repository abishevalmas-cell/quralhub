#!/usr/bin/env node
/**
 * Quralhub — Dynamic data updater (adapted from qural-project)
 * 1. Fetches NB RK currency rates from nationalbank.kz/rss/rates_all.xml
 * 2. Scrapes exchange office rates from kurs.kz
 * 3. Merges with existing data.json (preserves manual sections)
 *
 * Run: npm run update-rates
 * Schedule: GitHub Actions daily at 06:00 UTC (12:00 Astana)
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const RSS_URL = 'https://nationalbank.kz/rss/rates_all.xml';
const DATA_FILE = path.join(__dirname, '..', 'public', 'data.json');

const KURS_CITIES = [
  { slug: 'almaty', name: 'Алматы' },
  { slug: 'astana', name: 'Астана' },
  { slug: 'shymkent', name: 'Шымкент' },
  { slug: 'karaganda', name: 'Қарағанды' },
  { slug: 'aktobe', name: 'Ақтөбе' },
  { slug: 'pavlodar', name: 'Павлодар' },
  { slug: 'semey', name: 'Семей' },
  { slug: 'kostanay', name: 'Қостанай' },
  { slug: 'uralsk', name: 'Орал' },
  { slug: 'atyrau', name: 'Атырау' },
  { slug: 'taraz', name: 'Тараз' },
  { slug: 'ust-kamenogorsk', name: 'Өскемен' },
  { slug: 'aktau', name: 'Ақтау' },
  { slug: 'turkestan', name: 'Түркістан' },
];

const CURRENCIES_WE_NEED = ['USD', 'EUR', 'RUB', 'CNY'];

// ==================== FETCH HELPERS ====================

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : require('http');
    proto.get(url, {
      headers: { 'User-Agent': 'Quralhub/2.0 (data updater)' },
      timeout: 15000
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

// ==================== 1. NB RK RATES ====================

function parseNBRates(xml) {
  const rates = {};
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  items.forEach(item => {
    const title = (item.match(/<title>(.*?)<\/title>/) || [])[1];
    const desc = (item.match(/<description>(.*?)<\/description>/) || [])[1];
    const quant = (item.match(/<quant>(.*?)<\/quant>/) || [])[1];
    if (title && desc) {
      const code = title.trim().toUpperCase();
      const rate = parseFloat(desc);
      const quantity = parseInt(quant) || 1;
      if (!isNaN(rate)) {
        rates[code.toLowerCase()] = Math.round((rate / quantity) * 100) / 100;
      }
    }
  });
  return rates;
}

async function fetchNBRates() {
  console.log('[NB] Fetching rates from nationalbank.kz...');
  try {
    const xml = await fetchURL(RSS_URL);
    const allRates = parseNBRates(xml);
    const rates = {
      usd: allRates.usd,
      eur: allRates.eur,
      rub: allRates.rub,
      cny: allRates.cny,
      updatedAt: new Date().toISOString(),
      source: 'nationalbank.kz'
    };
    // Validate that we got actual values
    if (!rates.usd || !rates.eur || !rates.rub || !rates.cny) {
      console.warn('[NB] Missing some rates:', JSON.stringify(rates));
      return null;
    }
    console.log('[NB] OK:', JSON.stringify({ usd: rates.usd, eur: rates.eur, rub: rates.rub, cny: rates.cny }));
    return rates;
  } catch (err) {
    console.error('[NB] FAIL:', err.message);
    return null;
  }
}

// ==================== 2. EXCHANGE OFFICES (kurs.kz) ====================

function parseKursKz(html, cityName) {
  const match = html.match(/var\s+punkts\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) {
    console.warn(`[KURS] No punkts found for ${cityName}`);
    return [];
  }

  let punkts;
  try {
    punkts = new Function('return ' + match[1])();
  } catch (e) {
    console.warn(`[KURS] Parse error for ${cityName}:`, e.message);
    return [];
  }

  const valid = punkts.filter(p =>
    p.actual !== false &&
    p.data &&
    p.data.USD &&
    p.data.USD[0] > 0 &&
    p.data.USD[1] > 0
  );

  // Sort by best USD buy rate (highest = best for customer selling USD)
  valid.sort((a, b) => (b.data.USD?.[0] || 0) - (a.data.USD?.[0] || 0));

  // Take top 6
  const top = valid.slice(0, 6);

  return top.map(p => {
    const office = {
      name: p.name,
      lat: p.lat || null,
      lng: p.lng || null,
      address: p.address || p.mainaddress || '',
      phone: (p.phones && p.phones[0]) || p.phone || ''
    };
    for (const cur of CURRENCIES_WE_NEED) {
      if (p.data[cur] && p.data[cur][0] > 0) {
        office[cur.toLowerCase()] = {
          buy: p.data[cur][0],
          sell: p.data[cur][1]
        };
      }
    }
    return office;
  });
}

async function fetchExchangeOffices() {
  console.log('[KURS] Fetching exchange offices from kurs.kz...');
  const result = {};
  let successCount = 0;

  for (const city of KURS_CITIES) {
    try {
      const url = `https://kurs.kz/site/index?city=${city.slug}&lang=ru-RU`;
      const html = await fetchURL(url);
      const offices = parseKursKz(html, city.name);
      if (offices.length > 0) {
        result[city.name] = offices;
        successCount++;
        console.log(`[KURS] ${city.name}: ${offices.length} offices`);
      }
    } catch (err) {
      console.warn(`[KURS] ${city.name} FAIL:`, err.message);
    }
  }

  if (successCount === 0) return null;

  return {
    updatedAt: new Date().toISOString(),
    source: 'kurs.kz',
    data: result
  };
}

// ==================== MERGE & WRITE ====================

async function main() {
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.log('No existing data.json, starting fresh');
  }

  const now = new Date().toISOString();

  // Fetch auto-updated sections
  const [nbRates, exchangeOffices] = await Promise.all([
    fetchNBRates(),
    fetchExchangeOffices()
  ]);

  // Merge: auto sections overwrite, manual sections preserved
  const data = {
    ...existing,
    meta: {
      version: (existing.meta?.version || 0) + 1,
      generatedAt: now
    }
  };

  // NB Rates
  if (nbRates) {
    data.NB_RATES = nbRates;
  } else {
    console.log('[NB] Using existing rates (fetch failed)');
    if (!data.NB_RATES) {
      console.error('[NB] No existing rates available either!');
      process.exit(1);
    }
  }

  // Exchange offices
  if (exchangeOffices) {
    data.EXCHANGE_OFFICES = exchangeOffices;
  } else {
    console.log('[KURS] Using existing exchange data (fetch failed)');
  }

  // Manual sections preserved as-is: BNK, TELECOM, ISP_DATA, CM_TARIFFS, TAX

  // Write
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log('\nData updated. Sections:', Object.keys(data).filter(k => k !== 'meta').join(', '));
  console.log('Written to:', DATA_FILE);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
