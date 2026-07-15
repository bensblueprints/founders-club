#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');

function parseEnvFile(file) {
    if (!fs.existsSync(file)) return {};
    const env = {};
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;

        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        const quoted =
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"));
        if (quoted) value = value.slice(1, -1);
        env[key] = value;
    }

    return env;
}

function loadEnv(mode) {
    const file = mode === 'test' ? '.env.test' : '.env.local';
    const loaded = parseEnvFile(path.join(root, file));
    return { ...process.env, ...loaded };
}

function run(command, args, env, options = {}) {
    const result = spawnSync(command, args, {
        cwd: root,
        env,
        stdio: 'inherit',
        shell: process.platform === 'win32',
        ...options
    });

    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }

    if (result.status !== 0) process.exit(result.status || 1);
}

function waitForDb(env) {
    const attempts = Number(env.DB_WAIT_ATTEMPTS || 30);
    for (let i = 1; i <= attempts; i += 1) {
        const result = spawnSync(
            'docker',
            ['compose', 'exec', '-T', 'db', 'pg_isready', '-U', 'founders', '-d', 'founders_club'],
            {
                cwd: root,
                env,
                stdio: i === attempts ? 'inherit' : 'ignore',
                shell: process.platform === 'win32'
            }
        );

        if (result.status === 0) return;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }

    console.error('Postgres did not become ready in time.');
    process.exit(1);
}

function setup(mode) {
    const env = loadEnv(mode);
    run('docker', ['compose', 'up', '-d', 'db'], env);
    waitForDb(env);
    run('node', ['db/migrate.js'], env);
    run('node', ['db/seed-admins.js'], env);
    return env;
}

function printUsage() {
    console.log(`Usage: node tools/dev-stack.js <command>

Commands:
  setup       Start Docker Postgres, migrate, and seed using .env.local
  dev         Run setup, then start Next.js using .env.local
  test        Run setup, unit tests, and integration flow using .env.test
  integration Run setup and only the integration flow using .env.test
  down        Stop the Docker Postgres stack
`);
}

const command = process.argv[2] || 'dev';

if (command === 'setup') {
    setup('local');
} else if (command === 'dev') {
    const env = setup('local');
    const port = env.PORT || '3000';
    console.log(`\nLocal stack ready. Opening Next.js on http://localhost:${port}\n`);
    run('npx', ['next', 'dev', '--hostname', '0.0.0.0', '--port', port], env);
} else if (command === 'test') {
    const env = setup('test');
    run('npm', ['test'], env);
    run('npm', ['run', 'test:integration'], env);
} else if (command === 'integration') {
    const env = setup('test');
    run('npm', ['run', 'test:integration'], env);
} else if (command === 'down') {
    run('docker', ['compose', 'down'], process.env);
} else {
    printUsage();
    process.exit(1);
}
