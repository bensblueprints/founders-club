const crypto = require('crypto');

function key() {
    const raw = process.env.DATA_ENCRYPTION_KEY;
    if (!raw) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('DATA_ENCRYPTION_KEY is required in production');
        }
        return null;
    }
    // Accept a 32-byte base64 key or deterministically derive 32 bytes from a
    // long secret. The source value never leaves the server environment.
    const decoded = Buffer.from(raw, 'base64');
    return decoded.length === 32 ? decoded : crypto.createHash('sha256').update(raw).digest();
}

function encrypt(value) {
    if (!value) return null;
    const encryptionKey = key();
    if (!encryptionKey) return `local:${Buffer.from(String(value)).toString('base64')}`;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

function decrypt(value) {
    if (!value) return null;
    if (String(value).startsWith('local:')) {
        return Buffer.from(String(value).slice(6), 'base64').toString('utf8');
    }
    const [version, iv, tag, ciphertext] = String(value).split(':');
    if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('Invalid encrypted field');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
