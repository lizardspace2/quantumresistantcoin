const { ml_dsa65 } = require('../src/noble/ml-dsa.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const buf2hex = (buffer) => {
    return Array.from(buffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

const generate = () => {
    try {
        console.log('Generating ml-dsa65 (Dilithium3) keypair...');

        // Use crypto.randomBytes for Node.js environment
        const seed = crypto.randomBytes(32);

        // Need to convert Node Buffer to Uint8Array for noble
        const seedUint8 = new Uint8Array(seed);

        const keys = ml_dsa65.keygen(seedUint8);
        const publicKeyHex = buf2hex(keys.publicKey);
        const seedHex = buf2hex(seedUint8);

        const keyObj = { privateKey: seedHex };
        const outputPath = path.resolve(__dirname, '../genesis_key.json');
        fs.writeFileSync(outputPath, JSON.stringify(keyObj, null, 2));

        const pubKeyPath = path.resolve(__dirname, '../genesis_pubkey.txt');
        fs.writeFileSync(pubKeyPath, publicKeyHex);

        console.log('SUCCESS!');
        console.log('Public Key:', publicKeyHex);
        console.log('Private Key saved to:', outputPath);
    } catch (e) {
        console.error('Error:', e);
    }
};

generate();
