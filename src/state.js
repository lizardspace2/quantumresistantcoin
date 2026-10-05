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
const CryptoJS = __importStar(require("crypto-js"));
const calculateStateRoot = (unspentTxOuts) => {
    if (unspentTxOuts.length === 0) {
        return CryptoJS.SHA256("").toString();
    }
    // Sort by txOutId then txOutIndex to ensure consistent hash
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
    let hashInput = "";
    for (let i = 0; i < sortedUTXOs.length; i++) {
        const u = sortedUTXOs[i];
        hashInput += u.txOutId + u.txOutIndex + u.address + u.amount;
    }
    return CryptoJS.SHA256(hashInput).toString();
};
class State {
    constructor(initialUnspentTxOuts = []) {
        this.unspentTxOuts = initialUnspentTxOuts;
    }
    getUnspentTxOuts() {
        return this.unspentTxOuts;
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