// import * as _ from 'lodash';
import { UnspentTxOut, Transaction, TxIn, TxOut } from './transaction';
import * as CryptoJS from 'crypto-js';

const calculateStateRoot = (unspentTxOuts: UnspentTxOut[]): string => {
    // Sort by txOutId then txOutIndex to ensure consistent hash
    // Standard lexicographical sort for multiple fields
    const sortedUTXOs = [...unspentTxOuts].sort((a, b) => {
        if (a.txOutId < b.txOutId) return -1;
        if (a.txOutId > b.txOutId) return 1;
        if (a.txOutIndex < b.txOutIndex) return -1;
        if (a.txOutIndex > b.txOutIndex) return 1;
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

export class State {
    private unspentTxOuts: UnspentTxOut[];

    constructor(initialUnspentTxOuts: UnspentTxOut[] = []) {
        this.unspentTxOuts = initialUnspentTxOuts.map(u => new UnspentTxOut(u.txOutId, u.txOutIndex, u.address, u.amount));
    }

    public getUnspentTxOuts(): UnspentTxOut[] {
        return this.unspentTxOuts.map(u => new UnspentTxOut(u.txOutId, u.txOutIndex, u.address, u.amount));
    }

    public setUnspentTxOuts(newUnspentTxOuts: UnspentTxOut[]) {
        this.unspentTxOuts = newUnspentTxOuts;
    }

    public getRoot(): string {
        return calculateStateRoot(this.unspentTxOuts);
    }

    public isValidTxIn(txIn: TxIn): boolean {
        const referencedUTxOut = this.unspentTxOuts.find((uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex);
        return referencedUTxOut !== undefined;
    }

    public getTxInAmount(txIn: TxIn): number {
        const referencedUTxOut = this.unspentTxOuts.find((uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex);
        return referencedUTxOut ? referencedUTxOut.amount : 0;
    }
}
