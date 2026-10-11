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
 *
 * Snapshot bootstrap — runs inside the node image before the node starts:
 *
 *   node src/tools/bootstrap-snapshot.js
 *
 * Downloads the latest signed chain snapshot, verifies its SHA-256 and the
 * ML-DSA signature (against SNAPSHOT_SIGNER, the operator's pinned pubkey),
 * and writes data/blockchain.json so the node only syncs the remaining tip.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const https = __importStar(require("https"));
const fs_1 = require("fs");
const zlib_1 = require("zlib");
const crypto_1 = require("crypto");
// stream.pipeline exists at runtime (Node 18) but is missing from the
// project's old @types/node — resolve it dynamically.
const pipeline = (...streams) => new Promise((resolve, reject) => {
    require('stream').pipeline(...streams, (err) => err ? reject(err) : resolve());
});
const ml_dsa_1 = require("../noble/ml-dsa");
const DATA_DIR = 'data';
const BLOCKCHAIN_FILE = DATA_DIR + '/blockchain.json';
const GZ_TMP = DATA_DIR + '/chain.json.gz.part';
const CHAIN_TMP = DATA_DIR + '/blockchain.json.tmp';
const SNAPSHOT_URL = (process.env.SNAPSHOT_URL || 'https://master.quantumresistantcoin.com').replace(/\/$/, '');
const SNAPSHOT_SIGNER = process.env.SNAPSHOT_SIGNER || '';
const SNAPSHOT_FORCE = process.env.SNAPSHOT_FORCE === 'true';
const MESSAGE_PREFIX = 'quantix-snapshot';
const hex2buf = (hex) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
};
const fetchJson = (url, redirects = 3) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
            res.resume();
            resolve(fetchJson(String(res.headers.location), redirects - 1));
            return;
        }
        if (res.statusCode !== 200) {
            res.resume();
            reject(new Error(`GET ${url} -> HTTP ${res.statusCode}`));
            return;
        }
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
            try {
                resolve(JSON.parse(body));
            }
            catch (e) {
                reject(new Error(`GET ${url} -> invalid JSON`));
            }
        });
    }).on('error', reject);
});
const downloadFile = (url, dest, redirects = 3) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
            res.resume();
            resolve(downloadFile(String(res.headers.location), dest, redirects - 1));
            return;
        }
        if (res.statusCode !== 200) {
            res.resume();
            reject(new Error(`GET ${url} -> HTTP ${res.statusCode}`));
            return;
        }
        pipeline(res, (0, fs_1.createWriteStream)(dest)).then(resolve).catch(reject);
    }).on('error', reject);
});
const sha256File = (path) => new Promise((resolve, reject) => {
    const h = (0, crypto_1.createHash)('sha256');
    (0, fs_1.createReadStream)(path)
        .on('data', (d) => h.update(d))
        .on('end', () => resolve(h.digest('hex')))
        .on('error', reject);
});
const verifySignature = (signature, message, publicKey) => {
    if (publicKey.length === 1312) {
        return ml_dsa_1.ml_dsa44.verify(signature, message, publicKey);
    }
    return ml_dsa_1.ml_dsa65.verify(signature, message, publicKey);
};
const fail = (msg) => {
    console.error(`BOOTSTRAP FAILED: ${msg}`);
    process.exit(1);
};
const main = async () => {
    if (!(0, fs_1.existsSync)(DATA_DIR)) {
        (0, fs_1.mkdirSync)(DATA_DIR);
    }
    if (!SNAPSHOT_FORCE && (0, fs_1.existsSync)(BLOCKCHAIN_FILE) && (0, fs_1.statSync)(BLOCKCHAIN_FILE).size > 0) {
        console.log('Bootstrap: existing blockchain.json found — skipping snapshot download.');
        return;
    }
    console.log(`Bootstrap: fetching snapshot meta from ${SNAPSHOT_URL}/snapshot-meta ...`);
    const meta = await fetchJson(SNAPSHOT_URL + '/snapshot-meta');
    if (!meta || typeof meta.height !== 'number' || !meta.sha256 || !meta.signature || !meta.publicKey) {
        fail('snapshot meta is malformed');
    }
    console.log(`Bootstrap: snapshot height=${meta.height} generatedAt=${meta.generatedAt} size=${Math.round((meta.sizeBytes || 0) / 1048576)}MB`);
    if (SNAPSHOT_SIGNER) {
        if (meta.publicKey !== SNAPSHOT_SIGNER) {
            fail(`signer mismatch — meta signed by ${meta.publicKey.slice(0, 24)}... but SNAPSHOT_SIGNER is ${SNAPSHOT_SIGNER.slice(0, 24)}...`);
        }
    }
    else {
        console.warn('WARNING: SNAPSHOT_SIGNER not set — verifying the signature against the key embedded in the meta only.');
        console.warn('         Pin SNAPSHOT_SIGNER to the operator pubkey (see README) for real authenticity.');
    }
    console.log(`Bootstrap: downloading ${SNAPSHOT_URL}/snapshot ...`);
    await downloadFile(SNAPSHOT_URL + '/snapshot', GZ_TMP);
    const sha256 = await sha256File(GZ_TMP);
    if (sha256 !== meta.sha256) {
        (0, fs_1.unlinkSync)(GZ_TMP);
        fail(`sha256 mismatch: downloaded ${sha256.slice(0, 16)}... meta says ${meta.sha256.slice(0, 16)}...`);
    }
    console.log('Bootstrap: sha256 OK — verifying ML-DSA signature...');
    const message = new TextEncoder().encode(`${MESSAGE_PREFIX}:${meta.height}:${meta.sha256}`);
    const valid = verifySignature(hex2buf(meta.signature), message, hex2buf(meta.publicKey));
    if (!valid) {
        (0, fs_1.unlinkSync)(GZ_TMP);
        fail('INVALID snapshot signature — refusing to boot from it');
    }
    console.log(`Bootstrap: ML-DSA signature valid (signer ${meta.publicKey.slice(0, 24)}...)`);
    console.log('Bootstrap: decompressing...');
    await pipeline((0, fs_1.createReadStream)(GZ_TMP), (0, zlib_1.createGunzip)(), (0, fs_1.createWriteStream)(CHAIN_TMP));
    // Cheap structural sanity — the signature already proves integrity.
    // The last block's "index" field sits before its ~7KB signature, so a
    // fixed-size tail read is unreliable: find the last index occurrence.
    const size = (0, fs_1.statSync)(CHAIN_TMP).size;
    const content = require('fs').readFileSync(CHAIN_TMP, 'utf8');
    const lastIdx = content.lastIndexOf('"index":');
    const lastBlockIndex = lastIdx === -1 ? -1 : parseInt(content.substring(lastIdx + 8).trim());
    if (lastBlockIndex !== meta.height) {
        (0, fs_1.unlinkSync)(CHAIN_TMP);
        (0, fs_1.unlinkSync)(GZ_TMP);
        fail(`decompressed chain last index is ${lastBlockIndex}, expected ${meta.height} — corrupt snapshot`);
    }
    (0, fs_1.renameSync)(CHAIN_TMP, BLOCKCHAIN_FILE);
    (0, fs_1.unlinkSync)(GZ_TMP);
    console.log(`Bootstrap: ready — blockchain.json at height ${meta.height} (${Math.round(size / 1048576)}MB). Node will sync only the remaining tip.`);
};
main().catch((e) => fail(e.message));
//# sourceMappingURL=bootstrap-snapshot.js.map