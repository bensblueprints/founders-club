const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) {
    console.error('DATABASE_URL is required. Copy .env.example to .env and export it first.');
    process.exit(1);
}

const migrationDir = path.join(__dirname, '..', 'migrations');
const files = [
    path.join(__dirname, 'neon-schema.sql'),
    path.join(__dirname, 'auth-schema.sql'),
    ...fs.readdirSync(migrationDir)
        .filter(file => file.endsWith('.sql'))
        .sort()
        .map(file => path.join(migrationDir, file))
];

(async () => {
    const pool = new Pool({ connectionString: url });
    try {
        for (const file of files) {
            await pool.query(fs.readFileSync(file, 'utf8'));
            console.log(`Applied ${path.relative(process.cwd(), file)}`);
        }
    } finally {
        await pool.end();
    }
})().catch(error => {
    console.error(error.message);
    process.exit(1);
});
