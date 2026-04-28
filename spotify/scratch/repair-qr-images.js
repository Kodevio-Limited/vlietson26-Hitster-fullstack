const { Client } = require('pg');
const QRCode = require('qrcode');

const databaseUrl = "postgresql://neondb_owner:npg_lFxigpOb4DE0@ep-aged-moon-a4xshecd.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function repairQrImages() {
    const client = new Client({
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Find QR codes without images but with a code (URL)
        const res = await client.query('SELECT id, identifier, code FROM qr_codes WHERE image_url IS NULL AND code IS NOT NULL');
        
        console.log(`Found ${res.rowCount} QR codes to repair.`);

        for (const qr of res.rows) {
            console.log(`Generating image for ${qr.identifier}...`);
            
            const qrOptions = {
                errorCorrectionLevel: 'M',
                margin: 4,
                width: 300,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                },
            };

            const qrCodeDataUrl = await QRCode.toDataURL(qr.code, qrOptions);
            
            await client.query(
                'UPDATE qr_codes SET image_url = $1 WHERE id = $2',
                [qrCodeDataUrl, qr.id]
            );
            
            console.log(`Successfully updated ${qr.identifier}`);
        }

        console.log('All QR codes repaired!');
    } catch (err) {
        console.error('Error repairing QR codes:', err);
    } finally {
        await client.end();
    }
}

repairQrImages();
