const { randomBytes, createCipheriv, createDecipheriv } = require('crypto');
const { cpfEncryptionKey } = require('./config');

function encryptCpf(cpf) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', cpfEncryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(cpf, 'utf8'), cipher.final()]);

    return [
        'v1',
        iv.toString('base64'),
        cipher.getAuthTag().toString('base64'),
        encrypted.toString('base64')
    ].join(':');
}

function decryptCpf(value) {
    const [version, encodedIv, encodedTag, encodedData] = value.split(':');
    if (version !== 'v1' || !encodedIv || !encodedTag || !encodedData) {
        throw new Error('O CPF armazenado não usa o formato de criptografia reconhecido.');
    }

    const decipher = createDecipheriv('aes-256-gcm', cpfEncryptionKey, Buffer.from(encodedIv, 'base64'));
    decipher.setAuthTag(Buffer.from(encodedTag, 'base64'));
    return Buffer.concat([
        decipher.update(Buffer.from(encodedData, 'base64')),
        decipher.final()
    ]).toString('utf8');
}

module.exports = { encryptCpf, decryptCpf };
