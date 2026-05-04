const { Client } = require('pg');
require('dotenv').config();

async function checkCounts() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const qrCodes = await client.query('SELECT count(*) FROM qr_codes');
    const mappings = await client.query('SELECT count(*) FROM mappings');
    console.log('QR Codes count:', qrCodes.rows[0].count);
    console.log('Mappings count:', mappings.rows[0].count);
    
    if (mappings.rows[0].count > 0) {
      const latestMappings = await client.query('SELECT m.id, q.identifier, s.name FROM mappings m JOIN qr_codes q ON m.qr_code_id = q.id JOIN songs s ON m.song_id = s.id ORDER BY m.created_at DESC LIMIT 10');
      console.log('Latest Mappings:', latestMappings.rows);
    }
  } catch (err) {
    console.error('Error connecting to DB:', err);
  } finally {
    await client.end();
  }
}

checkCounts();
