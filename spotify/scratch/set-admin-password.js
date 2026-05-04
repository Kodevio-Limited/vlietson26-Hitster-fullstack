const { Client } = require('pg');
const bcrypt = require('bcrypt');

const databaseUrl = "postgresql://neondb_owner:npg_lFxigpOb4DE0@ep-aged-moon-a4xshecd.us-east-1.aws.neon.tech/neondb?sslmode=require";
const email = "abirjsr21@gmail.com";
const password = "PutkiAnik@12";

async function setPassword() {
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
        
        const res = await client.query(
            'UPDATE users SET password = $1 WHERE email = $2 RETURNING id',
            [hashedPassword, email]
        );

        if (res.rowCount > 0) {
            console.log(`Successfully updated password for ${email}`);
            console.log(`You can now login with:`);
            console.log(`Email: ${email}`);
            console.log(`Password: ${password}`);
        } else {
            console.log(`User ${email} not found in database.`);
        }
    } catch (err) {
        console.error('Error updating password:', err);
    } finally {
        await client.end();
    }
}

setPassword();
