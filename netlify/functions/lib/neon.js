// Shared server-side Neon Postgres client (replaces lib/supabase.js).
//
// All DB access is now server-side. Netlify Functions connect to Neon using the
// serverless driver over HTTP, reading the single connection string from
// process.env.DATABASE_URL (the Neon "pooled" connection string works best for
// serverless — it targets the -pooler host).
//
// Usage:
//   const { sql, isConfigured } = require('./lib/neon');
//   const rows = await sql`SELECT * FROM members WHERE id = ${id}`;
//
// `sql` is a tagged-template function: interpolated values become bound
// parameters ($1, $2, ...), so there is NO string interpolation into SQL and
// SQL injection is prevented by construction.

const { neon } = require('@neondatabase/serverless');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';

let _sql = null;
let _pool = null;

function useLocalPostgres() {
    if (process.env.DB_DRIVER === 'pg') return true;
    try {
        const host = new URL(DATABASE_URL).hostname;
        return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === 'postgres';
    } catch (_e) {
        return false;
    }
}

function compileTemplate(strings, values) {
    let text = strings[0];
    for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`;
    return { text, values };
}

function isConfigured() {
    return Boolean(DATABASE_URL);
}

// Lazily create the tagged-template client. Throws a clear error if called
// without a configured connection string — callers should check isConfigured()
// first and degrade gracefully.
function getSql() {
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL is not set — cannot reach Neon.');
    }
    if (!_sql) {
        if (useLocalPostgres()) {
            _pool = new Pool({ connectionString: DATABASE_URL });
            _sql = async (strings, ...values) => {
                const compiled = compileTemplate(strings, values);
                const result = await _pool.query(compiled.text, compiled.values);
                return result.rows;
            };
            _sql.query = async (text, params = []) => (await _pool.query(text, params)).rows;
        } else {
            _sql = neon(DATABASE_URL);
        }
    }
    return _sql;
}

// Convenience: a callable tagged-template proxy so callers can `const { sql } = require(...)`.
// It forwards the template call to the lazily-created client.
function sql(strings, ...values) {
    return getSql()(strings, ...values);
}

// Escape hatch for parameterized (non-template) queries when a query is built
// dynamically. Values are still bound parameters — never interpolated.
//   query('SELECT * FROM members WHERE id = $1', [id])
async function query(text, params = []) {
    const client = getSql();
    // The neon() client also exposes .query(text, params).
    return client.query(text, params);
}

module.exports = { sql, query, getSql, isConfigured, useLocalPostgres, DATABASE_URL };
