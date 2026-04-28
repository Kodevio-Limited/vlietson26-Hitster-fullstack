const { Client } = require('pg');
const bcrypt = require('bcrypt');

const databaseUrl = "postgresql://neondb_owner:npg_lFxigpOb4DE0@ep-aged-moon-a4xshecd.us-east-1.aws.neon.tech/neondb?sslmode=require";
const email = "abirjsr21@gmail.com";
const password = "PutkiAnik@12";

async function verifyInDb() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query('SELECT password FROM users WHERE email = $1', [email]);
        
        if (res.rows.length === 0) {
            console.log("User not found in DB");
            return;
        }

        const dbHash = res.rows[0].password;
        console.log("Found user in DB. Hash starts with:", dbHash.substring(0, 10));
        
        const match = await bcrypt.compare(password, dbHash);
        console.log("Does password 'PutkiAnik@12' match the hash in DB?", match);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

verifyInDb();