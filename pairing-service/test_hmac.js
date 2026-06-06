// test_hmac.js - validate HMAC generation/verification for pairing-service
import crypto from 'crypto';

const phone = '+15551234567';
const sessionId = 'sess_TEST01';
const code = 'ABCD-EFGH';
const ts = Date.now();
const secret = process.env.PAIRING_SECRET || 'test-pairing-secret';

const msg = `${phone}|${sessionId}|${code}|${ts}`;
const h = crypto.createHmac('sha256', secret).update(msg).digest('hex');
console.log('message:', msg);
console.log('sig:', h);

// verification
const h2 = crypto.createHmac('sha256', secret).update(msg).digest('hex');
console.log('match:', h === h2);
// age check (ms)
const age = Date.now() - ts;
console.log('age_ms:', age);
console.log('age < 5min:', age < 5*60*1000);
