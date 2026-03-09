// import * as _ from 'lodash';
import { UnspentTxOut, Transaction, TxIn, TxOut } from './transaction';
import * as CryptoJS from 'crypto-js';

const calculateStateRoot = (unspentTxOuts: UnspentTxOut[]): string => {
    // Sort by txOutId then txOutIndex to ensure consistent hash
    const sortedUTXOs = [...unspentTxOuts].sort((a, b) => {
        if (a.txOutId < b.txOutId) return -1;
        if (a.txOutId > b.txOutId) return 1;
        return a.txOutIndex - b.txOutIndex;
    });

    // Using toFixed(8) for the amount to ensure decimal consistency across platforms
    const utxoStrings = sortedUTXOs.map(u => u.txOutId + u.txOutIndex + u.address + u.amount.toFixed(8));

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
