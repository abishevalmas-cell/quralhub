#!/usr/bin/env node
/**
 * Quralhub — Validate data.json structure and freshness
 * Run: npm run validate-data
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'public', 'data.json');

function validate() {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Cannot read data.json:', e.message);
    process.exit(1);
  }

  const checks = [];

  // Check NB_RATES
  if (data.NB_RATES) {
    const { usd, eur, rub, cny } = data.NB_RATES;
    checks.push({ name: 'NB_RATES.usd', ok: typeof usd === 'number' && usd > 100, value: usd });
    checks.push({ name: 'NB_RATES.eur', ok: typeof eur === 'number' && eur > 100, value: eur });
    checks.push({ name: 'NB_RATES.rub', ok: typeof rub === 'number' && rub > 0, value: rub });
    checks.push({ name: 'NB_RATES.cny', ok: typeof cny === 'number' && cny > 0, value: cny });
    checks.push({ name: 'NB_RATES.source', ok: data.NB_RATES.source === 'nationalbank.kz', value: data.NB_RATES.source });
  } else {
    checks.push({ name: 'NB_RATES', ok: false, value: 'missing' });
  }

  // Check EXCHANGE_OFFICES
  if (data.EXCHANGE_OFFICES) {
    const cities = Object.keys(data.EXCHANGE_OFFICES.data || {});
    checks.push({ name: 'EXCHANGE_OFFICES.cities', ok: cities.length >= 3, value: `${cities.length} cities` });
  } else {
    checks.push({ name: 'EXCHANGE_OFFICES', ok: false, value: 'missing' });
  }

  // Check BNK
  if (data.BNK) {
    const banks = data.BNK.data || [];
    checks.push({ name: 'BNK.count', ok: banks.length >= 5, value: `${banks.length} banks` });
  } else {
    checks.push({ name: 'BNK', ok: false, value: 'missing' });
  }

  // Check TELECOM
  if (data.TELECOM) {
    const plans = data.TELECOM.data || [];
    checks.push({ name: 'TELECOM.count', ok: plans.length >= 5, value: `${plans.length} plans` });
  } else {
    checks.push({ name: 'TELECOM', ok: false, value: 'missing' });
  }

  // Check TAX
  if (data.TAX) {
    checks.push({ name: 'TAX.MRP', ok: typeof data.TAX.MRP === 'number' && data.TAX.MRP > 0, value: data.TAX.MRP });
    checks.push({ name: 'TAX.MZP', ok: typeof data.TAX.MZP === 'number' && data.TAX.MZP > 0, value: data.TAX.MZP });
  } else {
    checks.push({ name: 'TAX', ok: false, value: 'missing' });
  }

  // Check meta
  checks.push({ name: 'meta.generatedAt', ok: !!data.meta?.generatedAt, value: data.meta?.generatedAt });

  // Check freshness (not older than 48 hours)
  if (data.meta?.generatedAt) {
    const age = (Date.now() - new Date(data.meta.generatedAt).getTime()) / 3600000;
    checks.push({ name: 'freshness', ok: age < 48, value: `${age.toFixed(1)}h ago` });
  }

  // Check NB_RATES freshness separately
  if (data.NB_RATES?.updatedAt) {
    const age = (Date.now() - new Date(data.NB_RATES.updatedAt).getTime()) / 3600000;
    checks.push({ name: 'NB_RATES freshness', ok: age < 48, value: `${age.toFixed(1)}h ago` });
  }

  console.log('\nData validation results:');
  console.log('========================');
  let allOk = true;
  for (const c of checks) {
    const status = c.ok ? 'PASS' : 'FAIL';
    console.log(`  [${status}] ${c.name}: ${c.value}`);
    if (!c.ok) allOk = false;
  }

  if (!allOk) {
    console.log('\nValidation FAILED!');
    process.exit(1);
  }
  console.log('\nAll checks passed!');
}

validate();
