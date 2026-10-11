"use strict";
/*
 * Copyright 2026 lizrdspace2
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSnapshotLoop = exports.exportSnapshot = exports.SNAPSHOT_MESSAGE_PREFIX = void 0;
const fs_1 = require("fs");
const zlib_1 = require("zlib");
const crypto_1 = require("crypto");
// stream.pipeline exists at runtime (Node 18) but is missing from the
// project's old @types/node — resolve it dynamically.
const pipeline = (...streams) => new Promise((resolve, reject) => {
    require('stream').pipeline(...streams, (err) => err ? reject(err) : resolve());
});
const blockchain_1 = require("./blockchain");
const wallet_1 = require("./wallet");
const BLOCKCHAIN_FILE = 'data/blockchain.json';
const SNAPSHOT_DIR = 'data/snapshot';
const SNAPSHOT_GZ = SNAPSHOT_DIR + '/chain.json.gz';
const META_FILE = SNAPSHOT_DIR + '/meta.json';
exports.SNAPSHOT_MESSAGE_PREFIX = 'quantix-snapshot';
const buf2hex = (buffer) => Array.from(buffer).map((b) => b.toString(16).padStart(2, '0')).join('');
const hex2buf = (hex) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
};
const sha256File = (path) => new Promise((resolve, reject) => {
    const h = (0, crypto_1.createHash)('sha256');
    (0, fs_1.createReadStream)(path)
        .on('data', (d) => h.update(d))
        .on('end', () => resolve(h.digest('hex')))
        .on('error', reject);
});
const exportSnapshot = async () => {
    try {
        if (!(0, fs_1.existsSync)(BLOCKCHAIN_FILE)) {
            return false;
        }
        if (!(0, fs_1.existsSync)(SNAPSHOT_DIR)) {
            (0, fs_1.mkdirSync)(SNAPSHOT_DIR);
        }
        // Flush the latest in-memory state so the snapshot is as fresh as the node.
        await (0, blockchain_1.saveBlockchain)(true);
        const height = (0, blockchain_1.getLatestBlock)().index;
        const tmpGz = SNAPSHOT_GZ + '.tmp';
        await pipeline((0, fs_1.createReadStream)(BLOCKCHAIN_FILE), (0, zlib_1.createGzip)({ level: 6 }), (0, fs_1.createWriteStream)(tmpGz));
        const sha256 = await sha256File(tmpGz);
        (0, fs_1.renameSync)(tmpGz, SNAPSHOT_GZ);
        const message = `${exports.SNAPSHOT_MESSAGE_PREFIX}:${height}:${sha256}`;
        const signature = (0, wallet_1.getDilithiumSync)().sign(new TextEncoder().encode(message), hex2buf((0, wallet_1.getPrivateFromWallet)()), wallet_1.DILITHIUM_LEVEL);
        const meta = {
            height,
            sha256,
            signature: buf2hex(signature),
            publicKey: (0, wallet_1.getPublicFromWallet)(),
            generatedAt: new Date().toISOString(),
            sizeBytes: (0, fs_1.statSync)(SNAPSHOT_GZ).size
        };
        (0, fs_1.writeFileSync)(META_FILE + '.tmp', JSON.stringify(meta));
        (0, fs_1.renameSync)(META_FILE + '.tmp', META_FILE);
        console.log(`Snapshot exported: height=${height} size=${Math.round(meta.sizeBytes / 1048576)}MB sha256=${sha256.slice(0, 12)}...`);
        return true;
    }
    catch (e) {
        console.error('Snapshot export failed:', e.message);
        return false;
    }
};
exports.exportSnapshot = exportSnapshot;
const startSnapshotLoop = () => {
    const intervalMinutes = parseInt(process.env.SNAPSHOT_INTERVAL_MINUTES || '360');
    // First export once the chain has loaded, then on a fixed cadence.
    setTimeout(async () => {
        await exportSnapshot();
        setInterval(() => { exportSnapshot(); }, intervalMinutes * 60 * 1000);
    }, 60 * 1000);
    console.log(`Snapshot export enabled (every ${intervalMinutes}min, first run in 60s)`);
};
exports.startSnapshotLoop = startSnapshotLoop;
//# sourceMappingURL=snapshot.js.map