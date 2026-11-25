const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function requiredSecret(name, minimumLength) {
    const value = process.env[name];
    if (!value || value.length < minimumLength) {
        throw new Error(`${name} deve ser definido com pelo menos ${minimumLength} caracteres.`);
    }
    return value;
}

const jwtSecret = requiredSecret('JWT_SECRET', 32);
const encryptionKey = process.env.CPF_ENCRYPTION_KEY;

if (!encryptionKey) {
    throw new Error('CPF_ENCRYPTION_KEY deve conter uma chave aleatória de 32 bytes codificada em Base64.');
}

const decodedEncryptionKey = Buffer.from(encryptionKey, 'base64');
if (decodedEncryptionKey.length !== 32 || decodedEncryptionKey.toString('base64') !== encryptionKey) {
    throw new Error('CPF_ENCRYPTION_KEY deve conter uma chave aleatória de 32 bytes codificada em Base64.');
}

module.exports = {
    jwtSecret,
    cpfEncryptionKey: decodedEncryptionKey,
    port: Number(process.env.PORT) || 3000,
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'fisio_db'
    }
};
