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
const DILITHIUM_LEVEL = 3;

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

const getPublicKey = (aPrivateKey: string): string => {
    const keyBytes = hex2buf(aPrivateKey);
    let publicKey: Uint8Array;

    // ML-DSA-65 SK is ~4032 bytes (Round 3) or similar.
    // If length > 3000, we treat it as L3 SK.
    if (keyBytes.length > 3000) {
        // Assume L3 SK provided as raw hex
        // We cannot derive PK from SK easily without library support or parsing SK structure.
        // Assuming user provided correct key.
        // If this is a problem (noble doesn't match), the user should provide JSON / Seed.
        // Noble 0.5.4 ml_dsa65 sign doesn't return PK.
        throw new Error("Cannot derive Public Key from raw ML-DSA-65 Secret Key bytes. Please use Seed or JSON KeyPair.");
    }

    if (keyBytes.length === 32) {
        // Default to ML-DSA-65 (L3) for seeds, as Genesis uses L3.
        const keys = ml_dsa65.keygen(keyBytes);
        publicKey = keys.publicKey;
    } else {
        // Fallback / Try L3 first
        try {
            // If input is L2 SK (2560 bytes)
            if (keyBytes.length === 2560) {
                throw new Error("L2 SK not supported for default L3 Genesis context.");
            }
            // Default L3
            const keys = ml_dsa65.keygen(keyBytes.slice(0, 32));
            publicKey = keys.publicKey;
        } catch (e) {
            const keys = ml_dsa44.keygen(keyBytes.slice(0, 32));
            publicKey = keys.publicKey;
        }
    }
    return buf2hex(publicKey);
};

const getPublicFromWallet = (): string => {
    const privateKey = getPrivateFromWallet();
    return getPublicKey(privateKey);
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
            // Check for Seed (32 bytes) -> Default to L3
            if (privateKey.length === 32) {
                const keys = ml_dsa65.keygen(privateKey);
                return ml_dsa65.sign(message, keys.secretKey);
            }

            // Check for L3 SK (~4032 bytes)
            if (privateKey.length > 3000) {
                return ml_dsa65.sign(message, privateKey);
            }

            // Check for L2 SK (2560 bytes)
            if (privateKey.length === 2560) {
                return ml_dsa44.sign(message, privateKey);
            }

            // Default fallback
            return ml_dsa65.sign(message, privateKey);
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

    // Automatic fee deduction logic
    const FEE = 0.05;

    if (leftOverAmount === 0) {
        // If exact match, we can't pay fee unless we reduce amount? 
        // Usually invalid unless we have extra inputs. Assuming leftOver covers it or throws.
        // For simplicity in this logic: if leftOver is 0, we return just txOut1 and fee is 0 (which fails).
        // It implies the user must have slightly more than 'amount'.
        return [txOut1];
    } else if (leftOverAmount < FEE) {
        // Not enough left for fees.
        // We could just consume it all as fee?
        throw new Error(`Not enough funds for transaction fee. Leftover: ${leftOverAmount}, Required Fee: ${FEE}`);
    } else {
        // Deduct fee from the change sent back to sender
        const newLeftOver = leftOverAmount - FEE;
        const leftOverTx = new TxOut(myAddress, newLeftOver);
        return [txOut1, leftOverTx];
    }
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

export {
    initWallet, deleteWallet,
    getPrivateFromWallet, getPublicFromWallet,
    getBalance, findUnspentTxOuts,
    getDilithiumSync, DILITHIUM_LEVEL,
    createTransaction, getPublicKey
};
