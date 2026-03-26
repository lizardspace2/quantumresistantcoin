"use strict";
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
exports.State = void 0;
// import * as _ from 'lodash';
const transaction_1 = require("./transaction");
const CryptoJS = __importStar(require("crypto-js"));
const calculateStateRoot = (unspentTxOuts) => {
    // Sort by txOutId then txOutIndex to ensure consistent hash
    // Standard lexicographical sort for multiple fields
    const sortedUTXOs = [...unspentTxOuts].sort((a, b) => {
        if (a.txOutId < b.txOutId)
            return -1;
        if (a.txOutId > b.txOutId)
            return 1;
        if (a.txOutIndex < b.txOutIndex)
            return -1;
        if (a.txOutIndex > b.txOutIndex)
            return 1;
        return 0;
    });
    // We must match the network's string representation exactly.
    // The original code used `+ u.amount` which uses default .toString()
    const utxoStrings = sortedUTXOs.map(u => u.txOutId + u.txOutIndex + u.address + u.amount);
    if (utxoStrings.length === 0) {
        return CryptoJS.SHA256("").toString();
    }
    return CryptoJS.SHA256(utxoStrings.join('')).toString();
};
class State {
    constructor(initialUnspentTxOuts = []) {
        this.unspentTxOuts = initialUnspentTxOuts.map(u => new transaction_1.UnspentTxOut(u.txOutId, u.txOutIndex, u.address, u.amount));
    }
    getUnspentTxOuts() {
        return this.unspentTxOuts.map(u => new transaction_1.UnspentTxOut(u.txOutId, u.txOutIndex, u.address, u.amount));
    }
    setUnspentTxOuts(newUnspentTxOuts) {
        this.unspentTxOuts = newUnspentTxOuts;
    }
    getRoot() {
        return calculateStateRoot(this.unspentTxOuts);
    }
    isValidTxIn(txIn) {
        const referencedUTxOut = this.unspentTxOuts.find((uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex);
        return referencedUTxOut !== undefined;
    }
    getTxInAmount(txIn) {
        const referencedUTxOut = this.unspentTxOuts.find((uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex);
        return referencedUTxOut ? referencedUTxOut.amount : 0;
    }
}
exports.State = State;
//# sourceMappingURL=state.js.map