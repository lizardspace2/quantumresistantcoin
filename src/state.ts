// import * as _ from 'lodash';
import { UnspentTxOut, Transaction, TxIn, TxOut } from './transaction';
import * as CryptoJS from 'crypto-js';

const calculateStateRoot = (unspentTxOuts: UnspentTxOut[]): string => {
    if (unspentTxOuts.length === 0) {
        return CryptoJS.SHA256("").toString();
    }
    
    // Sort by txOutId then txOutIndex to ensure consistent hash
    const sortedUTXOs = [...unspentTxOuts].sort((a, b) => {
        if (a.txOutId < b.txOutId) return -1;
        if (a.txOutId > b.txOutId) return 1;
        if (a.txOutIndex < b.txOutIndex) return -1;
        if (a.txOutIndex > b.txOutIndex) return 1;
        return 0;
    });

    let hashInput = "";
    for (let i = 0; i < sortedUTXOs.length; i++) {
        const u = sortedUTXOs[i];
        hashInput += u.txOutId + u.txOutIndex + u.address + u.amount;
    }

    return CryptoJS.SHA256(hashInput).toString();
};

export class State {
    private unspentTxOuts: UnspentTxOut[];

    constructor(initialUnspentTxOuts: UnspentTxOut[] = []) {
        this.unspentTxOuts = initialUnspentTxOuts;
    }

    public getUnspentTxOuts(): UnspentTxOut[] {
        return this.unspentTxOuts;
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
