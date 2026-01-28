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
import * as CryptoJS from 'crypto-js';
import * as _ from 'lodash';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { broadcastLatest, broadCastTransactionPool } from './p2p';
import { getMerkleRoot } from './merkle';
import {
    getCoinbaseTransaction, isValidAddress, processTransactions, Transaction, UnspentTxOut, getTxFee
} from './transaction';
import { addToTransactionPool, getTransactionPool, updateTransactionPool, getCandidateTransactions } from './transactionPool';
import { createTransaction, findUnspentTxOuts, getBalance, getPrivateFromWallet, getPublicFromWallet, getDilithiumSync, DILITHIUM_LEVEL } from './wallet';
import { BigNumber } from 'bignumber.js';
import { yieldToEventLoop } from './utils_async';
import { ValidationError, ValidationErrorCode } from './validation_errors';
import { State } from './state';
import { BlockExecutor } from './execution';

class Block {

    public index: number;
    public hash: string;
    public previousHash: string;
    public timestamp: number;
    public data: Transaction[];
    public merkleRoot: string;
    public difficulty: number;
    public minterBalance: number;
    public minterAddress: string;
    public stateRoot: string;

    constructor(index: number, hash: string, previousHash: string,
        timestamp: number, data: Transaction[], merkleRoot: string, difficulty: number, minterBalance: number, minterAddress: string, stateRoot: string = '') {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.merkleRoot = merkleRoot;
        this.hash = hash;
        this.difficulty = difficulty;
        this.minterBalance = minterBalance;
        this.minterAddress = minterAddress;
        this.stateRoot = stateRoot;
    }
}

let genesisBlock: Block = null;

const mintingWithoutCoinIndex = 1000000;

const DATA_DIR = 'data';
const BLOCKCHAIN_FILE = 'data/blockchain.json';

let blockchain: Block[] = [];

let globalState: State = new State();
let unspentTxOuts: UnspentTxOut[] = [];

const TWO_POW_256 = new BigNumber(2).exponentiatedBy(256);

const GENESIS_ADDRESS = '9e78f27a794dd182ff8afd0c710d56bf161b05a797aef71fa40a8fe31139e5f0ad4e3b44e820fb76659f606a0b1859355db89c9e1c3f202f6cc571dfd79f3165c2ca3ba38a082070f31c67db1f6175910518c05deef1434b831d1e602c3d438450ab5b01316e6086bb67c0c1db9984b3dfe55a0edebb0c8bf6ee62290676da2b6220a24656230df39710b2bebac01683b27b8a59f938c0a8b47fa8e2af0fec2b4b3788f4779774cedef888435157f1dc2b384803b4bde561c703487cd26857f66aab277ca71f7bf5ff97ec360301d312c08c7bef4ef33f0cfba2f17502e213ae72fb0fcc460de06af7208a3a95c87a6d37fa48f340845f9183db020d0c5e210b7c0f262fb7e12c1087bc20405402937a77bb967a2193ebe4474c4fe36088545ac8561735116f0d46ac7b2dea337df56fdf6b1ec165817b0326ec9785e493a469e2fe8ad77a61d1c48cc69842a7693f41063d55d25d1152ee0282fcaea37a44501feb41e74e427911ad94216edab2154d2e3315e4717725f4f7a6175945424632e900a3f58bef387e967d4dca279bd6973174076bddce76b6f326bef4d2af35c37f8ab1542b3db7c7a6e162b85568ee5a33d634bb556073befcd5526759028499a6d29b2ce3373a8d5d734bbd8dda05372279d10f0d8241e0c05bc0e86a40344ac9ef9de7be6041a004f3884f6f71859d48136d09ac00646cf39347ae2a7c09a6d6cb9feebc211fcf17c45d4009b7918d36df2dd744f3d627a8c22a3bffda0f160f9df53ed559365d8507abae1d936aee1d4969271f114e5e6e55aa21e5c027ddf02a254d1935a396c03987e882e3caec19cb44ea995e606844266cd286cf6cb4ab5e2ce2bf396cbe0f2e5e5969979e3dafed2fde12e57d3a08037f07ca493244ab80b06de760cad1337b516bfbcda3dfa8cf9d073a4952bce006fdfd42b6a4027c705605b34f8ea2c0b672bddbe019161c19b470abb4a72a89ddefde6a5f388f487a729b11bcf2cd6f808086757a4f6e15cf672e4fc384dffb1cff1d373691c30dd48466d8b61a80e9e09ef0ddd013e9deafdf37bd0c4aa8a21fd309e187f2c4be023c8609ce4527cddcce98aa6a0561b7a100f12b212227b47b754fef958c22fe6167f73995acb2a1aa55e5896d84614060dd5bc25b9acbb9f898347c1c69da85f0db48fb3b53e476bdd77ec24266672e5aa6d2c40d8f090a9581af8f18ba7b84370db59855a143656fff86eda0b15d361bf8cc082fd7106dc4ab3df72c4b6d825c4d37769e58977c427ab486d464eec12d5ffff5a74d7b7e50364d775ebe96e5f875c8907f68a67a1b86a0cc88fa08757f741cd674d7e7913b3322e29b809e91e9c353dd5865e6d87dc3d731fd675cb59d6558eeecfb0b8ca976dd3c398c9d50c1abd7f0e729745d8ebcc449d147b3e52620a953674a3940f3e61a255adbcb661ed517c06950c248b20d20622214c1f1e7d3cae65d76c973cb74e66aadb88e5465a6d5144f53991e6f5586cafd3706c8e832db3f73f6c4b1ac4692ce1bb690a8f027cb86a3f77bd247c2b2e59b3a115dfc467d871e5e993089a8188453d7508ddb3972c2fc81c2c627a157997a5b68311a41adb95a2227a36b6616c29d616efda17ffe57a7d1732f6461d0885c20172b15f9bc972e1e0e11c4ed66bfd8e5704d9fc4c8b37e0cefe52167d935071bcc350136ea82c18abd64e044b58e6d3ebbcd4cc347019bc58d32f57f8d0df665f745511da76b3ad03a8456ba06de4564ed221708aabc403d28c0e81e8aa73a0913cec1b4dc4afae5a8e7092dd708a683172db79a299f4c9c328e7fd5d57ce4f7ceb17e83e4223c57e02108b3db61b80247';

const initGenesisBlock = (): void => {
    if (existsSync(BLOCKCHAIN_FILE)) {
        console.log('Loading blockchain from local file...');
        try {
            const fileContent = readFileSync(BLOCKCHAIN_FILE, 'utf8');
            const loadedChain = JSON.parse(fileContent);

            let tempUnspentTxOuts: UnspentTxOut[] = [];

            for (const block of loadedChain) {
                const retVal = processTransactions(block.data, tempUnspentTxOuts, block.index);
                if (retVal === null) {
                    throw Error('Invalid transactions in stored blockchain block ' + block.index);
                }
                tempUnspentTxOuts = retVal;
            }

            blockchain = loadedChain;
            unspentTxOuts = tempUnspentTxOuts;
            globalState = new State(unspentTxOuts);
            genesisBlock = blockchain[0];
            console.log('Blockchain loaded successfully. Height: ' + getLatestBlock().index);
            return;
        } catch (e) {
            console.log('Error loading blockchain from file, starting fresh: ' + e.message);
        }
    }

    try {
        const genesisAddress = GENESIS_ADDRESS;

        const genesisTransaction = {
            'txIns': [{ 'signature': '', 'txOutId': '', 'txOutIndex': 0 }],
            'txOuts': [{
                'address': genesisAddress,
                'amount': 100000000
            }],
            'id': ''
        };

        const txInContent = genesisTransaction.txIns
            .map((txIn: any) => txIn.txOutId + txIn.txOutIndex)
            .reduce((a, b) => a + b, '');
        const txOutContent = genesisTransaction.txOuts
            .map((txOut: any) => txOut.address + txOut.amount)
            .reduce((a, b) => a + b, '');
        genesisTransaction.id = CryptoJS.SHA256(txInContent + txOutContent).toString();

        const timestamp = 1465154705;
        const genesisMerkleRoot = getMerkleRoot([genesisTransaction]);
        const genesisDifficulty = 100000000;
        const genesisState = new State(processTransactions([genesisTransaction], [], 0));
        const genesisStateRoot = genesisState.getRoot();

        const hash = calculateHash(0, '', timestamp, genesisMerkleRoot, genesisDifficulty, 0, genesisAddress);

        genesisBlock = new Block(
            0, hash, '', timestamp, [genesisTransaction], genesisMerkleRoot, genesisDifficulty, 0, genesisAddress, genesisStateRoot
        );

        blockchain = [genesisBlock];
        unspentTxOuts = processTransactions(blockchain[0].data, [], 0);

        console.log('Genesis block initialized with Quantix address');
        saveBlockchain();
    } catch (error) {
        console.error('Error initializing genesis block:', error);
        throw error;
    }
};

const saveBlockchain = () => {
    try {
        if (!existsSync(DATA_DIR)) {
            mkdirSync(DATA_DIR);
        }
        writeFileSync(BLOCKCHAIN_FILE, JSON.stringify(blockchain));
    } catch (e) {
        console.log('Error saving blockchain: ' + e.message);
    }
};

const getBlockchain = (): Block[] => blockchain;

const getUnspentTxOuts = (): UnspentTxOut[] => _.cloneDeep(unspentTxOuts);

const setUnspentTxOuts = (newUnspentTxOut: UnspentTxOut[]) => {
    unspentTxOuts = newUnspentTxOut;
    globalState.setUnspentTxOuts(unspentTxOuts);
};

const getLatestBlock = (): Block => blockchain[blockchain.length - 1];

const getBlockHeaders = (start: number, end: number): Block[] => {
    return blockchain
        .slice(start, end)
        .map((block) => ({
            ...block,
            data: []
        }));
};

const BLOCK_GENERATION_INTERVAL: number = 300;

const DIFFICULTY_ADJUSTMENT_INTERVAL: number = 10;

const getDifficulty = (aBlockchain: Block[]): number => {
    const latestBlock: Block = aBlockchain[aBlockchain.length - 1];

    // Emergency Reset: If chain is stuck for > 1 hour, reset difficulty to 1 to allow recovery
    const currentTime = Math.round(new Date().getTime() / 1000);
    const timeSinceLastBlock = currentTime - latestBlock.timestamp;
    if (timeSinceLastBlock > 3600) {
        console.log(`EMERGENCY: Chain stuck for ${timeSinceLastBlock}s. Resetting difficulty to 1.`);
        return 1;
    }

    if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
        return getAdjustedDifficulty(latestBlock, aBlockchain);
    } else {
        return latestBlock.difficulty;
    }
};

const getAdjustedDifficulty = (latestBlock: Block, aBlockchain: Block[]) => {
    const prevAdjustmentBlock: Block = aBlockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
    const timeExpected: number = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
    const timeTaken: number = latestBlock.timestamp - prevAdjustmentBlock.timestamp;

    if (timeTaken < 1) {
        return prevAdjustmentBlock.difficulty * 4;
    }
    const multiplier = timeExpected / timeTaken;
    let adjustedDifficulty = prevAdjustmentBlock.difficulty * multiplier;

    if (adjustedDifficulty > prevAdjustmentBlock.difficulty * 4) {
        adjustedDifficulty = prevAdjustmentBlock.difficulty * 4;
    } else if (adjustedDifficulty < prevAdjustmentBlock.difficulty / 4) {
        adjustedDifficulty = prevAdjustmentBlock.difficulty / 4;
    }

    return Math.max(Math.floor(adjustedDifficulty), 1);
};

const getCurrentTimestamp = (): number => Math.round(new Date().getTime() / 1000);

const generateRawNextBlock = async (blockData: Transaction[]) => {
    const previousBlock: Block = getLatestBlock();
    const difficulty: number = getDifficulty(getBlockchain());
    const nextIndex: number = previousBlock.index + 1;
    const newBlock: Block = findBlock(nextIndex, previousBlock.hash, blockData, difficulty);
    if (newBlock !== null && await addBlockToChain(newBlock)) {
        broadcastLatest();
        return newBlock;
    } else {
        return null;
    }

};

const getMyUnspentTransactionOutputs = () => {
    return findUnspentTxOuts(getPublicFromWallet(), getUnspentTxOuts());
};

const generateNextBlock = async () => {
    const minterAddress = getPublicFromWallet();
    const latestBlock = getLatestBlock();
    const nextIndex = latestBlock.index + 1;

    const poolTxs = getCandidateTransactions(50, getUnspentTxOuts());

    const totalFees = poolTxs
        .map((tx) => getTxFee(tx, getUnspentTxOuts()))
        .reduce((a, b) => a + b, 0);

    const coinbaseTx: Transaction = getCoinbaseTransaction(minterAddress, nextIndex, totalFees);
    const blockData: Transaction[] = [coinbaseTx].concat(poolTxs);
    return await generateRawNextBlock(blockData);
};

const generatenextBlockWithTransaction = async (receiverAddress: string, amount: number) => {
    if (!isValidAddress(receiverAddress)) {
        throw Error('invalid address');
    }
    if (typeof amount !== 'number') {
        throw Error('invalid amount');
    }

    const latestBlock = getLatestBlock();
    const nextIndex = latestBlock.index + 1;
    const minterAddress = getPublicFromWallet();

    const tx: Transaction = createTransaction(receiverAddress, amount, getPrivateFromWallet(), getUnspentTxOuts(), getTransactionPool());

    const txFee = getTxFee(tx, getUnspentTxOuts());

    const coinbaseTx: Transaction = getCoinbaseTransaction(minterAddress, nextIndex, txFee);
    const blockData: Transaction[] = [coinbaseTx, tx];
    return await generateRawNextBlock(blockData);
};

const findBlock = (index: number, previousHash: string, data: Transaction[], difficulty: number): Block => {
    const timestamp: number = getCurrentTimestamp();
    const merkleRoot = getMerkleRoot(data);
    const hash: string = calculateHash(index, previousHash, timestamp, merkleRoot, difficulty, getAccountBalance(), getPublicFromWallet());

    if (isBlockStakingValid(previousHash, getPublicFromWallet(), timestamp, getAccountBalance(), difficulty, index)) {
        const currentUTXOs = getUnspentTxOuts();
        const nextUTXOs = processTransactions(data, currentUTXOs, index);
        const nextState = new State(nextUTXOs);
        const stateRoot = nextState.getRoot();

        return new Block(index, hash, previousHash, timestamp, data, merkleRoot, difficulty, getAccountBalance(), getPublicFromWallet(), stateRoot);
    }
    return null;
};

const getAccountBalance = (): number => {
    return getBalance(getPublicFromWallet(), getUnspentTxOuts());
};

const sendTransaction = (address: string, amount: number): Transaction => {
    const tx: Transaction = createTransaction(address, amount, getPrivateFromWallet(), getUnspentTxOuts(), getTransactionPool());
    addToTransactionPool(tx, getUnspentTxOuts());
    broadCastTransactionPool();
    return tx;
};

const calculateHashForBlock = (block: Block): string =>
    calculateHash(block.index, block.previousHash, block.timestamp, block.merkleRoot, block.difficulty, block.minterBalance, block.minterAddress);

const calculateHash = (index: number, previousHash: string, timestamp: number, merkleRoot: string,
    difficulty: number, minterBalance: number, minterAddress: string): string =>
    CryptoJS.SHA256(index + previousHash + timestamp + merkleRoot + difficulty + minterBalance + minterAddress).toString();

const isValidBlockStructure = (block: Block): boolean => {
    return typeof block.index === 'number'
        && typeof block.hash === 'string'
        && typeof block.previousHash === 'string'
        && typeof block.timestamp === 'number'
        && typeof block.data === 'object'
        && typeof block.merkleRoot === 'string'
        && typeof block.merkleRoot === 'string'
        && typeof block.difficulty === 'number'
        && typeof block.minterBalance === 'number'
        && typeof block.minterAddress === 'string';

};

const isValidBlockHeader = (newBlock: Block, previousBlock: Block): boolean => {
    if (!isValidBlockStructure(newBlock)) {
        console.log('invalid block structure: %s', JSON.stringify(newBlock));
        return false;
    }
    if (previousBlock.index + 1 !== newBlock.index) {
        console.log('invalid index');
        return false;
    } else if (previousBlock.hash !== newBlock.previousHash) {
        console.log('invalid previoushash');
        return false;
    } else if (!isValidTimestamp(newBlock, previousBlock)) {
        console.log('invalid timestamp');
        return false;
    } else if (!hasValidHash(newBlock)) {
        return false;
    }

    // Security Fix: Restrict Emergency Difficulty Reset to Genesis Address ONLY
    if (newBlock.difficulty === 1 && newBlock.index > 10) {
        if (newBlock.minterAddress !== GENESIS_ADDRESS) {
            console.log('INVALID MINTER: Only Genesis Address can mine recovery blocks with difficulty 1');
            return false;
        }
    }

    return true;
};

const isValidNewBlock = (newBlock: Block, previousBlock: Block): boolean => {
    if (!isValidBlockHeader(newBlock, previousBlock)) {
        return false;
    }
    if (getMerkleRoot(newBlock.data) !== newBlock.merkleRoot) {
        console.log('invalid merkle root');
        return false;
    }
    return true;
};

const getAccumulatedDifficulty = (aBlockchain: Block[]): BigNumber => {
    return aBlockchain
        .reduce((sum, block) => sum.plus(new BigNumber(2).exponentiatedBy(block.difficulty)), new BigNumber(0));
};

const isValidTimestamp = (newBlock: Block, previousBlock: Block): boolean => {
    return (previousBlock.timestamp - 60 < newBlock.timestamp)
        && newBlock.timestamp - 60 < getCurrentTimestamp();
};

const hasValidHash = (block: Block): boolean => {

    if (!hashMatchesBlockContent(block)) {
        console.log('invalid hash, got:' + block.hash);
        return false;
    }

    if (!isBlockStakingValid(block.previousHash, block.minterAddress, block.minterBalance, block.timestamp, block.difficulty, block.index)) {
        console.log('staking hash not lower than balance over diffculty times 2^256');
        return false;
    }
    return true;
};

const hashMatchesBlockContent = (block: Block): boolean => {
    const blockHash: string = calculateHashForBlock(block);
    return blockHash === block.hash;
};

const isBlockStakingValid = (prevhash: string, address: string, timestamp: number, balance: number, difficulty: number, index: number): boolean => {
    difficulty = difficulty + 1;

    if (index <= mintingWithoutCoinIndex) {
        balance = balance + 1;
    }

    const balanceOverDifficulty = TWO_POW_256.times(balance).dividedBy(difficulty);
    const stakingHash: string = CryptoJS.SHA256(prevhash + address + timestamp).toString();
    const decimalStakingHash = new BigNumber(stakingHash, 16);
    const difference = balanceOverDifficulty.minus(decimalStakingHash).toNumber();

    return difference >= 0;
};

const isValidChain = async (blockchainToValidate: Block[]): Promise<UnspentTxOut[]> => {
    console.log('isValidChain:');
    console.log(JSON.stringify(blockchainToValidate));
    const isValidGenesis = (block: Block): boolean => {
        if (block.index !== 0) {
            return false;
        }
        if (block.previousHash !== '') {
            return false;
        }
        if (block.data.length !== 1) {
            return false;
        }
        if (block.data[0].txIns.length !== 1 || block.data[0].txOuts.length !== 1) {
            return false;
        }
        if (block.data[0].txOuts[0].amount !== 100000000) {
            return false;
        }
        return hashMatchesBlockContent(block);
    };

    if (!isValidGenesis(blockchainToValidate[0])) {
        console.log('isValidChain: Genesis block validation failed');
        console.log('Expected: Index 0, PrevHash "", Date length 1, 1 TxIn/TxOut, Amount 100000000');
        console.log('Received: ' + JSON.stringify(blockchainToValidate[0]));
        return null;
    }

    let aUnspentTxOuts: UnspentTxOut[] = [];

    for (let i = 0; i < blockchainToValidate.length; i++) {
        if (i % 10 === 0) {
            await yieldToEventLoop();
        }

        const currentBlock: Block = blockchainToValidate[i];

        let currentState: State;
        if (i === 0) {
            const genesisUTXOs = processTransactions(currentBlock.data, [], 0);
            currentState = new State(genesisUTXOs);
            if (currentBlock.stateRoot && currentBlock.stateRoot !== currentState.getRoot()) {
                throw new ValidationError('Genesis State Root mismatch', ValidationErrorCode.INVALID_BLOCK_HASH, true);
            }
            aUnspentTxOuts = genesisUTXOs;
        } else {
            currentState = new State(aUnspentTxOuts);

            if (!isValidNewBlock(currentBlock, blockchainToValidate[i - 1])) {
                console.log('isValidChain: Block ' + i + ' is invalid compared to block ' + (i - 1));
                return null;
            }

            try {
                const newState = await BlockExecutor.executeBlock(currentBlock, currentState);
                aUnspentTxOuts = newState.getUnspentTxOuts();
            } catch (e) {
                console.log('Invalid block execution at index ' + i + ': ' + e.message);
                if (e instanceof ValidationError && e.shouldBan) throw e;
                return null;
            }
        }
    }
    return aUnspentTxOuts;
};

const addBlockToChain = async (newBlock: Block): Promise<boolean> => {
    if (isValidNewBlock(newBlock, getLatestBlock())) {
        try {
            const currentState = new State(getUnspentTxOuts());
            const newState = await BlockExecutor.executeBlock(newBlock, currentState);
            const retVal = newState.getUnspentTxOuts();

            blockchain.push(newBlock);
            setUnspentTxOuts(retVal);
            updateTransactionPool(unspentTxOuts);
            saveBlockchain();
            return true;
        } catch (e) {
            console.log('block execution failed', e);
            if (e instanceof ValidationError && e.shouldBan) throw e;
            return false;
        }
    } else {
        return false;
    }
};

const getCumulativeDifficulty = (aBlockchain: Block[]): BigNumber => {
    return aBlockchain
        .map((block) => new BigNumber(block.difficulty))
        .reduce((a, b) => a.plus(b), new BigNumber(0));
};

const replaceChain = async (newBlocks: Block[]) => {
    const newUnspentTxOuts = await isValidChain(newBlocks);
    if (newUnspentTxOuts !== null &&
        getCumulativeDifficulty(newBlocks).gt(getCumulativeDifficulty(blockchain))) {
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');

        blockchain = newBlocks;
        setUnspentTxOuts(newUnspentTxOuts);
        updateTransactionPool(unspentTxOuts);
        broadcastLatest();
        saveBlockchain();
    } else {
        console.log('Received blockchain invalid or not heavier');
    }
};

const handleReceivedTransaction = (transaction: Transaction) => {
    addToTransactionPool(transaction, getUnspentTxOuts());
};

const getTotalSupply = (): number => {
    return getUnspentTxOuts()
        .map((uTxO) => uTxO.amount)
        .reduce((a, b) => a + b, 0);
};

const getAllBalances = (): object => {
    const balances = {};
    getUnspentTxOuts().forEach((uTxO) => {
        if (!balances[uTxO.address]) {
            balances[uTxO.address] = 0;
        }
        balances[uTxO.address] += uTxO.amount;
    });
    return balances;
};

export {
    Block, getBlockchain, getUnspentTxOuts, getLatestBlock, sendTransaction,
    generateRawNextBlock, generateNextBlock, generatenextBlockWithTransaction,
    handleReceivedTransaction, getMyUnspentTransactionOutputs,
    getAccountBalance,
    isValidBlockStructure,
    replaceChain,
    addBlockToChain,
    getCumulativeDifficulty,
    initGenesisBlock,
    getBlockHeaders, isValidBlockHeader,
    getTotalSupply, getAllBalances
};
