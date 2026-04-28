const { Client } = require('pg');
const bcrypt = require('bcrypt');

const databaseUrl = "postgresql://neondb_owner:npg_lFxigpOb4DE0@ep-aged-moon-a4xshecd.us-east-1.aws.neon.tech/neondb?sslmode=require";
const email = "abirjsr21@gmail.com";
const password = "PutkiAnik@12";

async function upsertAdmin() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Check if user exists
        const checkRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        
        if (checkRes.rowCount > 0) {
            // Update
            await client.query(
                'UPDATE users SET password = $1, role = $2 WHERE email = $3',
                [hashedPassword, 'admin', email]
            );
            console.log(`Successfully updated password for existing user ${email} and promoted to admin.`);
        } else {
            // Insert
            // Using gen_random_uuid() which is common in modern Postgres
            try {
                await client.query(
                    'INSERT INTO users (id, email, password, role, is_active, display_name) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)',
                    [email, hashedPassword, 'admin', true, 'Admin User']
                );
                console.log(`Successfully created new admin user with gen_random_uuid(): ${email}`);
            } catch (e) {
                console.log('gen_random_uuid() failed, trying without explicit ID...');
                await client.query(
                    'INSERT INTO users (email, password, role, is_active, display_name) VALUES ($1, $2, $3, $4, $5)',
                    [email, hashedPassword, 'admin', true, 'Admin User']
                );
                console.log(`Successfully created new admin user (auto-id): ${email}`);
            }
        }
        
        console.log(`You can now login with:`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
    } catch (err) {
        console.error('Error upserting admin:', err);
    } finally {
        await client.end();
    }
}

upsertAdmin();
