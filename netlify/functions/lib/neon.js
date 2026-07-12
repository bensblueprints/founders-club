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

const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';

let _sql = null;

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
        _sql = neon(DATABASE_URL);
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

module.exports = { sql, query, getSql, isConfigured, DATABASE_URL };
