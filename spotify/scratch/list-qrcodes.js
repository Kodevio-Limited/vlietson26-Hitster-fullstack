const { Client } = require('pg');
require('dotenv').config();

async function checkQrCodes() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const qrCodes = await client.query('SELECT identifier, created_at FROM qr_codes ORDER BY created_at DESC');
    console.log('QR Codes:', qrCodes.rows);
  } catch (err) {
    console.error('Error connecting to DB:', err);
  } finally {
    await client.end();
  }
}

checkQrCodes();
