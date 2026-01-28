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
 * This file has been modified by lizrdspace2.
 * Based on work by Sandoche Adittane and Lauri Hartikka.
 */

import * as crypto from 'crypto';
import { ml_dsa65, ml_dsa44 } from './noble/ml-dsa';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import _ from 'lodash';
import { UnspentTxOut, TxIn, Transaction, TxOut, signTxIn, getTransactionId } from './transaction';

const privateKeyFile = 'node/wallet/private_key';

// @noble/post-quantum helpers
const buf2hex = (buffer: Uint8Array): string => {
    return Array.from(buffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

const hex2buf = (hex: string): Uint8Array => {
    if (typeof hex !== 'string') {
        hex = String(hex);
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
};

const getPrivateFromWallet = (): string => {
    const content = readFileSync(privateKeyFile, 'utf8');
    try {
        const json = JSON.parse(content);
        if (json.privateKey) {
            return String(json.privateKey);
        }
        return content;
    } catch (e) {
        return content;
    }
};

const getPublicFromWallet = (): string => {
    const privateKey = getPrivateFromWallet();
    const keyBytes = hex2buf(privateKey);
    let publicKey: Uint8Array;

    if (keyBytes.length === 32) {
        // Default to Level 2
        const keys = ml_dsa44.keygen(keyBytes);
        publicKey = keys.publicKey;
    } else {
        try {
            if (keyBytes.length === 2560) {
                throw new Error("Cannot derive PK from SK without re-keygen. Use Seed.");
            }
            const keys = ml_dsa44.keygen(keyBytes.slice(0, 32));
            publicKey = keys.publicKey;
        } catch (e) {
            // Fallback: Try using first 32 bytes as seed for L2 (default migration)
            const keys = ml_dsa44.keygen(keyBytes.slice(0, 32));
            publicKey = keys.publicKey;
        }
    }
    return buf2hex(publicKey);
};

// Generates a new wallet (overwrites existing)
const initWallet = () => {
    if (existsSync(privateKeyFile)) {
        return;
    }
    const seed = new Uint8Array(crypto.randomBytes(32));
    const seedHex = buf2hex(seed);
    const keyObj = { privateKey: seedHex };
    writeFileSync(privateKeyFile, JSON.stringify(keyObj, null, 2));
    console.log('New wallet initialized.');
};

const deleteWallet = () => {
    if (existsSync(privateKeyFile)) {
        unlinkSync(privateKeyFile);
    }
};

const getBalance = (address: string, unspentTxOuts: UnspentTxOut[]): number => {
    return _(findUnspentTxOuts(address, unspentTxOuts))
        .map((uTxO: UnspentTxOut) => uTxO.amount)
        .sum();
};

const findUnspentTxOuts = (ownerAddress: string, unspentTxOuts: UnspentTxOut[]) => {
    return _.filter(unspentTxOuts, (uTxO: UnspentTxOut) => uTxO.address === ownerAddress);
};

// Replaces the old 'dilithium' binding.
const getDilithiumSync = () => {
    return {
        // Sign: (message, privateKey, level) -> signature
        sign: (message: Uint8Array, privateKey: Uint8Array, level: number) => {
            // Level 2 (ML-DSA-44): Seed 32, SK 2560
            // Level 3 (ML-DSA-65): Seed 32, SK 4032

            let secretKey = privateKey;

            // Case: Seed provided (32 bytes)
            if (privateKey.length === 32) {
                if (level === 2) {
                    const keys = ml_dsa44.keygen(privateKey);
                    return ml_dsa44.sign(message, keys.secretKey);
                } else {
                    const keys = ml_dsa65.keygen(privateKey);
                    return ml_dsa65.sign(message, keys.secretKey);
                }
            }

            // Case: Full SK provided
            if (privateKey.length === 2560) {
                return ml_dsa44.sign(message, privateKey);
            }

            // Default/Fallback to ML-DSA-65
            return ml_dsa65.sign(message, secretKey);
        },
        // Verify: (signature, message, publicKey, level) -> boolean
        verify: (signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array, level: number) => {
            if (publicKey.length === 1312) {
                return ml_dsa44.verify(signature, message, publicKey);
            }
            return ml_dsa65.verify(signature, message, publicKey);
        }
    };
};

const DILITHIUM_LEVEL = 3;

// --- Helper for createTransaction (Local version of getPublicFromWallet logic) ---
const getPublicKey = (aPrivateKey: string): string => {
    const keyBytes = hex2buf(aPrivateKey);
    let publicKey: Uint8Array;

    if (keyBytes.length === 32) {
        const keys = ml_dsa44.keygen(keyBytes);
        publicKey = keys.publicKey;
    } else {
        try {
            if (keyBytes.length === 2560) {
                throw new Error("Only Seed-based private keys supported for now");
            }
            const keys = ml_dsa44.keygen(keyBytes.slice(0, 32));
            publicKey = keys.publicKey;
        } catch (e) {
            const keys = ml_dsa44.keygen(keyBytes.slice(0, 32));
            publicKey = keys.publicKey;
        }
    }
    return buf2hex(publicKey);
};

const createTransaction = (receiverAddress: string, amount: number, privateKey: string, unspentTxOuts: UnspentTxOut[], txPool: Transaction[]): Transaction => {
    const myAddress: string = getPublicKey(privateKey);
    const myUnspentTxOutsA = unspentTxOuts.filter((uTxO: UnspentTxOut) => uTxO.address === myAddress);

    const myUnspentTxOuts = filterTxPoolTxs(myUnspentTxOutsA, txPool);

    const { includedUnspentTxOuts, leftOverAmount } = findTxOutsForAmount(amount, myUnspentTxOuts);

    const toUnsignedTxIn = (uTxO: UnspentTxOut) => {
        const txIn: TxIn = new TxIn();
        txIn.txOutId = uTxO.txOutId;
        txIn.txOutIndex = uTxO.txOutIndex;
        return txIn;
    };

    const unsignedTxIns: TxIn[] = includedUnspentTxOuts.map(toUnsignedTxIn);

    const tx: Transaction = new Transaction();
    tx.txIns = unsignedTxIns;
    tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);
    tx.id = getTransactionId(tx);

    tx.txIns = tx.txIns.map((txIn: TxIn, index: number) => {
        txIn.signature = signTxIn(tx, index, privateKey, unspentTxOuts);
        return txIn;
    });

    return tx;
};

const filterTxPoolTxs = (unspentTxOuts: UnspentTxOut[], transactionPool: Transaction[]): UnspentTxOut[] => {
    const txIns: TxIn[] = _(transactionPool)
        .map((tx: Transaction) => tx.txIns)
        .flatten()
        .value();

    const removable: UnspentTxOut[] = [];
    for (const unspentTxOut of unspentTxOuts) {
        const txIn = _.find(txIns, (aTxIn: TxIn) => {
            return aTxIn.txOutIndex === unspentTxOut.txOutIndex && aTxIn.txOutId === unspentTxOut.txOutId;
        });

        if (txIn !== undefined) {
            removable.push(unspentTxOut);
        }
    }

    return _.without(unspentTxOuts, ...removable);
};

const findTxOutsForAmount = (amount: number, myUnspentTxOuts: UnspentTxOut[]) => {
    let currentAmount = 0;
    const includedUnspentTxOuts = [];
    for (const myUnspentTxOut of myUnspentTxOuts) {
        includedUnspentTxOuts.push(myUnspentTxOut);
        currentAmount = currentAmount + myUnspentTxOut.amount;
        if (currentAmount >= amount) {
            const leftOverAmount = currentAmount - amount;
            return { includedUnspentTxOuts, leftOverAmount };
        }
    }

    const eMsg = 'Cannot create transaction from the available unspent transaction outputs.' +
        ' Required amount:' + amount + '. Available unspentTxOuts:' + JSON.stringify(myUnspentTxOuts);
    throw Error(eMsg);
};

const createTxOuts = (receiverAddress: string, myAddress: string, amount: number, leftOverAmount: number) => {
    const txOut1: TxOut = new TxOut(receiverAddress, amount);
    if (leftOverAmount === 0) {
        return [txOut1];
    } else {
        const leftOverTx = new TxOut(myAddress, leftOverAmount);
        return [txOut1, leftOverTx];
    }
};

export {
    initWallet, deleteWallet,
    getPrivateFromWallet, getPublicFromWallet,
    getBalance, findUnspentTxOuts,
    getDilithiumSync, DILITHIUM_LEVEL,
    createTransaction
};
