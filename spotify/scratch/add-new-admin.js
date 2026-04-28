const { Client } = require('pg');
const bcrypt = require('bcrypt');

const databaseUrl = "postgresql://neondb_owner:npg_lFxigpOb4DE0@ep-aged-moon-a4xshecd.us-east-1.aws.neon.tech/neondb?sslmode=require";
const email = "omgevingsverbinder@gmail.com";
const password = "Fiver123!?";

async function upsertAdmin() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Use UPSERT (INSERT ... ON CONFLICT)
        const query = `
            INSERT INTO users (email, password, role)
            VALUES ($1, $2, 'admin')
            ON CONFLICT (email) 
            DO UPDATE SET 
                password = EXCLUDED.password, 
                role = 'admin'
            RETURNING id;
        `;

        const res = await client.query(query, [email, hashedPassword]);

        if (res.rowCount > 0) {
            console.log(`Successfully added/updated admin: ${email}`);
            console.log(`You can now login with:`);
            console.log(`Email: ${email}`);
            console.log(`Password: ${password}`);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

upsertAdmin();