#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const envFile = path.join(root, '.env.local');

function readEnv(file) {
    const values = {};
    if (!fs.existsSync(file)) return values;
    for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const separator = line.indexOf('=');
        if (separator < 1) continue;
        const key = line.slice(0, separator).trim();
        let value = line.slice(separator + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        values[key] = value;
    }
    return values;
}

function runSetup(env) {
    const result = spawnSync('node', ['tools/dev-stack.js', 'setup'], {
        cwd: root,
        env,
        stdio: 'inherit'
    });
    if (result.status !== 0) process.exit(result.status || 1);
}

const baseEnv = { ...process.env, ...readEnv(envFile) };
const requestedPort = Number(baseEnv.PORT || 3000);

function persistLocalEnv(updates) {
    const existing = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
    const lines = existing.split(/\r?\n/);
    const seen = new Set();
    const next = lines.map(line => {
        const match = line.match(/^([A-Z0-9_]+)=/);
        if (!match || !Object.prototype.hasOwnProperty.call(updates, match[1])) return line;
        seen.add(match[1]);
        return `${match[1]}=${updates[match[1]]}`;
    });
    for (const [key, value] of Object.entries(updates)) {
        if (!seen.has(key)) next.push(`${key}=${value}`);
    }
    fs.writeFileSync(envFile, next.join('\n').replace(/\n*$/, '\n'));
}

function stopExistingProjectDevServer() {
    const lockFile = path.join(root, '.next', 'dev', 'lock');
    if (!fs.existsSync(lockFile)) return;
    const result = spawnSync('lsof', ['-t', lockFile], { encoding: 'utf8' });
    const pids = String(result.stdout || '').trim().split(/\s+/).filter(Boolean).map(Number);
    for (const pid of pids) {
        if (!Number.isInteger(pid) || pid === process.pid) continue;
        console.log(`Stopping the existing Next.js dev server for this project (PID ${pid})...`);
        try { process.kill(pid, 'SIGTERM'); } catch (_) {}
    }
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline && pids.some(pid => {
        try { process.kill(pid, 0); return true; } catch (_) { return false; }
    })) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
}

stopExistingProjectDevServer();

function findAvailablePort(start) {
    for (let port = start; port < start + 20; port += 1) {
        const probe = spawnSync('nc', ['-z', '127.0.0.1', String(port)], { stdio: 'ignore' });
        if (probe.status !== 0) return String(port);
    }
    throw new Error(`No free development port found between ${start} and ${start + 19}`);
}

const port = findAvailablePort(requestedPort);

runSetup(baseEnv);

let nextProcess = null;
let stopped = false;
const tunnel = spawn('ssh', [
    '-T',
    '-o', 'StrictHostKeyChecking=accept-new',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ServerAliveCountMax=3',
    '-o', 'ExitOnForwardFailure=yes',
    '-R', `80:127.0.0.1:${port}`,
    'serveo.net'
], {
    cwd: root,
    env: baseEnv,
    stdio: ['ignore', 'pipe', 'pipe']
});

const timeout = setTimeout(() => {
    console.error('Timed out while creating the public tunnel.');
    shutdown(1);
}, 30000);

function startNext(publicUrl) {
    if (nextProcess || stopped) return;
    clearTimeout(timeout);
    const webhookUrls = {
        AIRWALLEX_WEBHOOK_URL: `${publicUrl}/api/function/airwallex-webhook`,
        SEPAY_WEBHOOK_URL: `${publicUrl}/api/function/sepay-webhook`,
        RESEND_WEBHOOK_URL: `${publicUrl}/api/function/resend-webhook`
    };
    persistLocalEnv(webhookUrls);
    const runtimeEnv = {
        ...baseEnv,
        PORT: port,
        URL: publicUrl,
        NEXT_PUBLIC_SITE_URL: publicUrl,
        ...webhookUrls
    };
    // Let Next.js own empty values from .env.local so editing a provider secret
    // can trigger its normal development env reload without restarting the tunnel.
    for (const [key, value] of Object.entries(runtimeEnv)) {
        if (value === '') delete runtimeEnv[key];
    }

    console.log('\nPublic development stack is ready:');
    console.log(`  Website:            ${publicUrl}`);
    console.log(`  Airwallex webhook:  ${webhookUrls.AIRWALLEX_WEBHOOK_URL}`);
    console.log(`  SePay webhook:      ${webhookUrls.SEPAY_WEBHOOK_URL}`);
    console.log(`  Resend webhook:     ${webhookUrls.RESEND_WEBHOOK_URL}`);
    console.log(`  Local fallback:     http://localhost:${port}`);
    console.log('\nKeep this command running while testing provider webhooks.');
    console.log('Public tunnel URLs change when this command is restarted.\n');

    nextProcess = spawn('npx', ['next', 'dev', '--hostname', '0.0.0.0', '--port', port], {
        cwd: root,
        env: runtimeEnv,
        stdio: 'inherit'
    });
    nextProcess.on('exit', code => shutdown(code || 0));
}

function inspectTunnelOutput(chunk) {
    const message = chunk.toString();
    const match = message.match(/https:\/\/[a-z0-9-]+\.serveousercontent\.com/i);
    if (match) startNext(match[0]);
    if (process.env.DEBUG_TUNNEL === '1') process.stderr.write(message);
}

tunnel.stdout.on('data', inspectTunnelOutput);
tunnel.stderr.on('data', inspectTunnelOutput);
tunnel.on('error', error => {
    console.error(`Could not start the public tunnel: ${error.message}`);
    shutdown(1);
});
tunnel.on('exit', code => {
    if (stopped) return;
    console.error(`The public tunnel exited and the webhook URL is no longer available (code ${code ?? 1}).`);
    shutdown(code || 1);
});

function shutdown(code = 0) {
    if (stopped) return;
    stopped = true;
    clearTimeout(timeout);
    if (nextProcess && !nextProcess.killed) nextProcess.kill('SIGTERM');
    if (!tunnel.killed) tunnel.kill('SIGTERM');
    setTimeout(() => process.exit(code), 100);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
