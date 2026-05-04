const { Client } = require('pg');

const databaseUrl = "postgresql://neondb_owner:npg_lFxigpOb4DE0@ep-aged-moon-a4xshecd.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function listUsers() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const res = await client.query('SELECT email, role FROM users');
        console.log('Current users:');
        console.table(res.rows);
    } catch (err) {
        console.error('Error listing users:', err);
    } finally {
        await client.end();
    }
}

listUsers();
