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

import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, statSync, writeFileSync } from 'fs';
import { createGzip } from 'zlib';
import { createHash } from 'crypto';

// stream.pipeline exists at runtime (Node 18) but is missing from the
// project's old @types/node — resolve it dynamically.
const pipeline = (...streams: any[]): Promise<void> =>
    new Promise((resolve, reject) => {
        (require('stream') as any).pipeline(...streams, (err: any) => err ? reject(err) : resolve());
    });
import { getLatestBlock, saveBlockchain } from './blockchain';
import { getPrivateFromWallet, getPublicFromWallet, getDilithiumSync, DILITHIUM_LEVEL } from './wallet';

const BLOCKCHAIN_FILE = 'data/blockchain.json';
const SNAPSHOT_DIR = 'data/snapshot';
const SNAPSHOT_GZ = SNAPSHOT_DIR + '/chain.json.gz';
const META_FILE = SNAPSHOT_DIR + '/meta.json';
export const SNAPSHOT_MESSAGE_PREFIX = 'quantix-snapshot';

const buf2hex = (buffer: Uint8Array): string =>
    Array.from(buffer).map((b) => b.toString(16).padStart(2, '0')).join('');

const hex2buf = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
};

const sha256File = (path: string): Promise<string> =>
    new Promise((resolve, reject) => {
        const h = createHash('sha256');
        createReadStream(path)
            .on('data', (d) => h.update(d))
            .on('end', () => resolve(h.digest('hex')))
            .on('error', reject);
    });

const exportSnapshot = async (): Promise<boolean> => {
    try {
        if (!existsSync(BLOCKCHAIN_FILE)) {
            return false;
        }
        if (!existsSync(SNAPSHOT_DIR)) {
            mkdirSync(SNAPSHOT_DIR);
        }

        // Flush the latest in-memory state so the snapshot is as fresh as the node.
        await saveBlockchain(true);
        const height = getLatestBlock().index;

        const tmpGz = SNAPSHOT_GZ + '.tmp';
        await pipeline(
            createReadStream(BLOCKCHAIN_FILE),
            createGzip({ level: 6 }),
            createWriteStream(tmpGz)
        );
        const sha256 = await sha256File(tmpGz);
        renameSync(tmpGz, SNAPSHOT_GZ);

        const message = `${SNAPSHOT_MESSAGE_PREFIX}:${height}:${sha256}`;
        const signature = getDilithiumSync().sign(
            new TextEncoder().encode(message),
            hex2buf(getPrivateFromWallet()),
            DILITHIUM_LEVEL
        );

        const meta = {
            height,
            sha256,
            signature: buf2hex(signature),
            publicKey: getPublicFromWallet(),
            generatedAt: new Date().toISOString(),
            sizeBytes: statSync(SNAPSHOT_GZ).size
        };
        writeFileSync(META_FILE + '.tmp', JSON.stringify(meta));
        renameSync(META_FILE + '.tmp', META_FILE);

        console.log(`Snapshot exported: height=${height} size=${Math.round(meta.sizeBytes / 1048576)}MB sha256=${sha256.slice(0, 12)}...`);
        return true;
    } catch (e: any) {
        console.error('Snapshot export failed:', e.message);
        return false;
    }
};

const startSnapshotLoop = () => {
    const intervalMinutes = parseInt(process.env.SNAPSHOT_INTERVAL_MINUTES || '360');
    // First export once the chain has loaded, then on a fixed cadence.
    setTimeout(async () => {
        await exportSnapshot();
        setInterval(() => { exportSnapshot(); }, intervalMinutes * 60 * 1000);
    }, 60 * 1000);
    console.log(`Snapshot export enabled (every ${intervalMinutes}min, first run in 60s)`);
};

export { exportSnapshot, startSnapshotLoop };
