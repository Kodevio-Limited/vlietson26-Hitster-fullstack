const { Client } = require('pg');

const databaseUrl = "postgresql://neondb_owner:npg_lFxigpOb4DE0@ep-aged-moon-a4xshecd.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function alterColumn() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        await client.query('ALTER TABLE qr_codes ALTER COLUMN image_url TYPE text');
        console.log('Successfully altered column image_url to TYPE text');
        
    } catch (err) {
        console.error('Error altering column:', err);
    } finally {
        await client.end();
    }
}

alterColumn();
