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
 * This file has been modified by lizrdspace2.
 * Based on work by Sandoche Adittane and Lauri Hartikka.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicKey = exports.createTransaction = exports.DILITHIUM_LEVEL = exports.getDilithiumSync = exports.findUnspentTxOuts = exports.getBalance = exports.getPublicFromWallet = exports.getPrivateFromWallet = exports.deleteWallet = exports.initWallet = void 0;
const crypto = __importStar(require("crypto"));
const ml_dsa_1 = require("./noble/ml-dsa");
const fs_1 = require("fs");
const lodash_1 = __importDefault(require("lodash"));
const transaction_1 = require("./transaction");
const privateKeyFile = 'node/wallet/private_key';
const DILITHIUM_LEVEL = 3;
exports.DILITHIUM_LEVEL = DILITHIUM_LEVEL;
// @noble/post-quantum helpers
const buf2hex = (buffer) => {
    return Array.from(buffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};
const hex2buf = (hex) => {
    if (typeof hex !== 'string') {
        hex = String(hex);
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
};
const getPrivateFromWallet = () => {
    const content = (0, fs_1.readFileSync)(privateKeyFile, 'utf8');
    try {
        const json = JSON.parse(content);
        if (json.privateKey) {
            return String(json.privateKey);
        }
        return content;
    }
    catch (e) {
        return content;
    }
};
exports.getPrivateFromWallet = getPrivateFromWallet;
const getPublicKey = (aPrivateKey) => {
    const keyBytes = hex2buf(aPrivateKey);
    let publicKey;
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
        const keys = ml_dsa_1.ml_dsa65.keygen(keyBytes);
        publicKey = keys.publicKey;
    }
    else {
        // Fallback / Try L3 first
        try {
            // If input is L2 SK (2560 bytes)
            if (keyBytes.length === 2560) {
                throw new Error("L2 SK not supported for default L3 Genesis context.");
            }
            // Default L3
            const keys = ml_dsa_1.ml_dsa65.keygen(keyBytes.slice(0, 32));
            publicKey = keys.publicKey;
        }
        catch (e) {
            const keys = ml_dsa_1.ml_dsa44.keygen(keyBytes.slice(0, 32));
            publicKey = keys.publicKey;
        }
    }
    return buf2hex(publicKey);
};
exports.getPublicKey = getPublicKey;
const getPublicFromWallet = () => {
    const privateKey = getPrivateFromWallet();
    return getPublicKey(privateKey);
};
exports.getPublicFromWallet = getPublicFromWallet;
// Generates a new wallet (overwrites existing)
const initWallet = () => {
    if ((0, fs_1.existsSync)(privateKeyFile)) {
        return;
    }
    const seed = new Uint8Array(crypto.randomBytes(32));
    const seedHex = buf2hex(seed);
    const keyObj = { privateKey: seedHex };
    (0, fs_1.writeFileSync)(privateKeyFile, JSON.stringify(keyObj, null, 2));
    console.log('New wallet initialized.');
};
exports.initWallet = initWallet;
const deleteWallet = () => {
    if ((0, fs_1.existsSync)(privateKeyFile)) {
        (0, fs_1.unlinkSync)(privateKeyFile);
    }
};
exports.deleteWallet = deleteWallet;
const getBalance = (address, unspentTxOuts) => {
    return (0, lodash_1.default)(findUnspentTxOuts(address, unspentTxOuts))
        .map((uTxO) => uTxO.amount)
        .sum();
};
exports.getBalance = getBalance;
const findUnspentTxOuts = (ownerAddress, unspentTxOuts) => {
    return lodash_1.default.filter(unspentTxOuts, (uTxO) => uTxO.address === ownerAddress);
};
exports.findUnspentTxOuts = findUnspentTxOuts;
// Replaces the old 'dilithium' binding.
const getDilithiumSync = () => {
    return {
        // Sign: (message, privateKey, level) -> signature
        sign: (message, privateKey, level) => {
            // Check for Seed (32 bytes) -> Default to L3
            if (privateKey.length === 32) {
                const keys = ml_dsa_1.ml_dsa65.keygen(privateKey);
                return ml_dsa_1.ml_dsa65.sign(message, keys.secretKey);
            }
            // Check for L3 SK (~4032 bytes)
            if (privateKey.length > 3000) {
                return ml_dsa_1.ml_dsa65.sign(message, privateKey);
            }
            // Check for L2 SK (2560 bytes)
            if (privateKey.length === 2560) {
                return ml_dsa_1.ml_dsa44.sign(message, privateKey);
            }
            // Default fallback
            return ml_dsa_1.ml_dsa65.sign(message, privateKey);
        },
        // Verify: (signature, message, publicKey, level) -> boolean
        verify: (signature, message, publicKey, level) => {
            if (publicKey.length === 1312) {
                return ml_dsa_1.ml_dsa44.verify(signature, message, publicKey);
            }
            return ml_dsa_1.ml_dsa65.verify(signature, message, publicKey);
        }
    };
};
exports.getDilithiumSync = getDilithiumSync;
const filterTxPoolTxs = (unspentTxOuts, transactionPool) => {
    const txIns = (0, lodash_1.default)(transactionPool)
        .map((tx) => tx.txIns)
        .flatten()
        .value();
    const removable = [];
    for (const unspentTxOut of unspentTxOuts) {
        const txIn = lodash_1.default.find(txIns, (aTxIn) => {
            return aTxIn.txOutIndex === unspentTxOut.txOutIndex && aTxIn.txOutId === unspentTxOut.txOutId;
        });
        if (txIn !== undefined) {
            removable.push(unspentTxOut);
        }
    }
    return lodash_1.default.without(unspentTxOuts, ...removable);
};
const findTxOutsForAmount = (amount, myUnspentTxOuts) => {
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
const createTxOuts = (receiverAddress, myAddress, amount, leftOverAmount) => {
    const txOut1 = new transaction_1.TxOut(receiverAddress, amount);
    // Automatic fee deduction logic
    const FEE = 0.00001;
    if (leftOverAmount === 0) {
        // If exact match, we can't pay fee unless we reduce amount? 
        // Usually invalid unless we have extra inputs. Assuming leftOver covers it or throws.
        // For simplicity in this logic: if leftOver is 0, we return just txOut1 and fee is 0 (which fails).
        // It implies the user must have slightly more than 'amount'.
        return [txOut1];
    }
    else if (leftOverAmount < FEE) {
        // Not enough left for fees.
        // We could just consume it all as fee?
        throw new Error(`Not enough funds for transaction fee. Leftover: ${leftOverAmount}, Required Fee: ${FEE}`);
    }
    else {
        // Deduct fee from the change sent back to sender
        const newLeftOver = leftOverAmount - FEE;
        const leftOverTx = new transaction_1.TxOut(myAddress, newLeftOver);
        return [txOut1, leftOverTx];
    }
};
const createTransaction = (receiverAddress, amount, privateKey, unspentTxOuts, txPool) => {
    const myAddress = getPublicKey(privateKey);
    const myUnspentTxOutsA = unspentTxOuts.filter((uTxO) => uTxO.address === myAddress);
    const myUnspentTxOuts = filterTxPoolTxs(myUnspentTxOutsA, txPool);
    const { includedUnspentTxOuts, leftOverAmount } = findTxOutsForAmount(amount, myUnspentTxOuts);
    const toUnsignedTxIn = (uTxO) => {
        const txIn = new transaction_1.TxIn();
        txIn.txOutId = uTxO.txOutId;
        txIn.txOutIndex = uTxO.txOutIndex;
        return txIn;
    };
    const unsignedTxIns = includedUnspentTxOuts.map(toUnsignedTxIn);
    const tx = new transaction_1.Transaction();
    tx.txIns = unsignedTxIns;
    tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);
    tx.id = (0, transaction_1.getTransactionId)(tx);
    tx.txIns = tx.txIns.map((txIn, index) => {
        txIn.signature = (0, transaction_1.signTxIn)(tx, index, privateKey, unspentTxOuts);
        return txIn;
    });
    return tx;
};
exports.createTransaction = createTransaction;
//# sourceMappingURL=wallet.js.map