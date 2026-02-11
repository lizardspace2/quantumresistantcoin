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
exports.getAllBalances = exports.getTotalSupply = exports.isValidBlockHeader = exports.getBlockHeaders = exports.initGenesisBlock = exports.getCumulativeDifficulty = exports.addBlockToChain = exports.replaceChain = exports.isValidBlockStructure = exports.getAccountBalance = exports.getMyUnspentTransactionOutputs = exports.handleReceivedTransaction = exports.generatenextBlockWithTransaction = exports.generateNextBlock = exports.generateRawNextBlock = exports.sendTransaction = exports.getLatestBlock = exports.getUnspentTxOuts = exports.getBlockchain = exports.Block = void 0;
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
const CryptoJS = __importStar(require("crypto-js"));
const _ = __importStar(require("lodash"));
const fs_1 = require("fs");
const p2p_1 = require("./p2p");
const merkle_1 = require("./merkle");
const transaction_1 = require("./transaction");
const transactionPool_1 = require("./transactionPool");
const wallet_1 = require("./wallet");
const bignumber_js_1 = require("bignumber.js");
const utils_async_1 = require("./utils_async");
const validation_errors_1 = require("./validation_errors");
const state_1 = require("./state");
const execution_1 = require("./execution");
class Block {
    constructor(index, hash, previousHash, timestamp, data, merkleRoot, difficulty, minterBalance, minterAddress, stateRoot = '') {
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
exports.Block = Block;
let genesisBlock = null;
const mintingWithoutCoinIndex = 1000000;
const DATA_DIR = 'data';
const BLOCKCHAIN_FILE = 'data/blockchain.json';
let blockchain = [];
let globalState = new state_1.State();
let unspentTxOuts = [];
const TWO_POW_256 = new bignumber_js_1.BigNumber(2).exponentiatedBy(256);
const GENESIS_ADDRESS = '684c43ab5620bf4db3854b7c98eda946677f9655cfc6b5f4b07a786090d942660daa3d0feaa4dafbc840ec50b8118581169b987c3ea22c721ef184c3483ed89ecc8662aa93aa1b438ea807c36ffb447f7bf711b5e6b99b72e30b002c7b3ba8ae99c88c244a68c1bae528c65f0a8e72a20ab3f4e948afd782494025d15c31a93b2802ecf2776eb57e6fbd805b85f643dfa220e1db426ec5f983319c047c0af594af06b4b2ba87985d073d4acd49279c4849ace443da11d00538358741a9f13378963c3255a24324afdcc278516aaa5ed1cad0d475e98c05c16bea448bcb68abe1fe07616d44a6c272858952b4cc791a0f8288c126b1dfd3be31369f52b83dc012337bb5bf284a31d85f93ba8f5cd7fa9b297e6f9211c10ca88ebddb27bf61cf137bf91b53335b7246a4f925abdffc81a9dda70fb0377baaa7edf958e3097ba412e0a27cfdee9e5d92122e14b9143d98c2320cc3e809d6ca0a5df12bdf653aa68df73dcf7468b7247d14dcbf0dcce6e6e0810cd6d171d0b84bda3b795afbda2e89560431afacc953f37b9ffe527f5d935393273594735fccd93e5ac231890dbd88c8c57115db1bfaed668f3f340388104a4a78198d3e1175a60e5b57bca073df87dd27bacd9f67e43efc2680f1daad480833347d9d1139acbaf55c00493ba39ca880c81659d980cd988f8e221c45841e4c6fdcb4d0b29843bc4dde91908628521b386795953d52c3f584ce4ebb7639f34ad1d2b67955a9165b7e4e2eb76f3e5f79cb4594ae756a791c4cb1861e649a293fd4d2fee5390c6be56ecaf83763dbf08e85fa2e6d120b71cc271c9f1b544cda395e3b65e6bbbe3ed81faa01f9474fda9d2cd4f8b9c5383e4046d4bc1749c2159a666c9515b7b927c4048941a4267d87ff0320c5883379cf1e6b4b894d8cadbf1d8ec877e8b020bc6a046d8cbfc74b4ec2ae4ec6f10fd53ee98aace86e2afddc6a085a72aa5b04480477170d2987820740b73e2d0dcaeb1e4ea75e420f99fa03793c31c0d6374e059a2675922f87d2b18a2fc4316dd50f598aa36d34ecba5c6256b8898588ecbc15652fb4994227094742360d333ccccf70e9492ad78702e9fcaca6555181e411b9ab48e62aee9982378d19936928fa1a9c2fe9935d72975649f7865621347a127fbea291589787e501640bc0235fc764230bb5a5392b1a4d4284be3658797d959432dac544b0ff5303b130cc4b2807b7c7b0e72bcf0a74ee3128ffc875655aa0c6e3aa2660dbca9ca1331753dcbd3ac4b7929d8c4af0675d93c1206a363e96236fa90496c29b47ffdac05b51f9c3b61d020acb3d5ed221d83cad03cded2121c3cd7cc1acf82ae9bdd93d73afa6cba5af28441ce78238ce867a53fe2f1f16985868da22740106464d5458b85f28a7ae6ffc3b08e59b323194c56978d55acc32811b46108fe69a2ecdbbfd9fef39e1dfe8287805de8ce194c7bc6ac668c7964d733afddc3d592ad5cc435d3454969fe88ca68f8b331704c400a45e52d3bc0981bd372652c25d7413000bd3ce24be8f01af149c561d9d4ef5c0918f922d55b0fa44124ded5550fffe5f81bc20e64ca7659a1a4882bbc98c53bb6ea0e5bc19b420de2b4887b1359f6dab5ec55557caab1124ffaaa689d5a59ffd407586306627d7832f4dbb66ffcbf78ac6c9cd09d930f525de2b12d4b31fddc5552c866c20432be40fcea27f455b720544599bd939ede63f671a0753e7ee9911de0de10cdc1bbe2864a032f06ef10dc1dc6580a19b9543ade4700fcebd6ee62a0964b493ba09294fd530c653448a4c6698504773526bd50c153aadc70b503db51db671cc3dc359458e71b496e43924e55476cc5332d679413ce71664e08d083e9b922d1a875c91a346b5b984116b32c789cdf7e045c0da4e9b30a3e5848dadf78a7ff793bc6cca7fa3807f9b7e64a6b37e68c726a614a6064df7e217f001190869d9b50cd39533db1861dfbcbf3ad1d2274d53671489f4bcae5737ced4be34d1c857a8350ba7bfd22d4fb516296cb1b699e01cdc825954e782b37a7d70230750313c43e0cec16e08ee0220aacbd6b48f43728da9d3295dc16b6a9245badd7845d1048cb01b0582f870a64a896b27700ab672a5d560dc28be33eddc69f34f46821df4eb98500ea4630d4025c0d06dd3484e21aef97d25a04bfa54df4cfec468eeb65d31929783443f7a11730ce4bb131f4d14fd5ac59386dcc7bd1c4e83cb4c0ee9e0538b61dcbb1207d7617c6ebaaeff257c6cc90d8e5dca0cb68f3712fe49f3a7e0e5f64d873676b2f7c0cb5bb9eea76f84a5cbe61dd340bf3ee17787d1d69074192a5e7c0c0ebecc03e09f0f4e99c286ce0fed56164202b67444607de21f0bf8c4d0b7823bf5598d4be81c2ae120f3f281a10218378e0c024cb1114613367ba72086f18f04764ae8f55f74f7e53f7cebda114fcd753eff7cd146e57530ae57f2d67781a282b40550816b548a7fe67f62b16503d03bfa18cd2a640e2f5d688457e1bcab1f54005de3142c2cef9f5e8f8ec05404536328a336142ee03729225f0f9d557c1d3d05aa2765dfe0eaf0a560cf9797b9f0135f2ca02d45cbfd7c743ead6703258fe431743dc4603ef8e636d6b77b6d6c3a365908b2122b7aab6966c81682870e018cde21027a32ab09571da760c77c5497d689ede2554024e6781abdf1bb662fb63af402df547b452e3f8cd9951840f896b19f7caf0baa9dc65324575b4b12d3871d998fdbf475f832f51e2358ae';
const initGenesisBlock = () => {
    if ((0, fs_1.existsSync)(BLOCKCHAIN_FILE)) {
        console.log('Loading blockchain from local file...');
        try {
            const fileContent = (0, fs_1.readFileSync)(BLOCKCHAIN_FILE, 'utf8');
            const loadedChain = JSON.parse(fileContent);
            let tempUnspentTxOuts = [];
            for (const block of loadedChain) {
                const retVal = (0, transaction_1.processTransactions)(block.data, tempUnspentTxOuts, block.index);
                if (retVal === null) {
                    throw Error('Invalid transactions in stored blockchain block ' + block.index);
                }
                tempUnspentTxOuts = retVal;
            }
            blockchain = loadedChain;
            unspentTxOuts = tempUnspentTxOuts;
            globalState = new state_1.State(unspentTxOuts);
            genesisBlock = blockchain[0];
            console.log('Blockchain loaded successfully. Height: ' + getLatestBlock().index);
            return;
        }
        catch (e) {
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
            .map((txIn) => txIn.txOutId + txIn.txOutIndex)
            .reduce((a, b) => a + b, '');
        const txOutContent = genesisTransaction.txOuts
            .map((txOut) => txOut.address + txOut.amount)
            .reduce((a, b) => a + b, '');
        genesisTransaction.id = CryptoJS.SHA256(txInContent + txOutContent).toString();
        const timestamp = 1465154705;
        const genesisMerkleRoot = (0, merkle_1.getMerkleRoot)([genesisTransaction]);
        const genesisDifficulty = 100000000;
        const genesisState = new state_1.State((0, transaction_1.processTransactions)([genesisTransaction], [], 0));
        const genesisStateRoot = genesisState.getRoot();
        const hash = calculateHash(0, '', timestamp, genesisMerkleRoot, genesisDifficulty, 0, genesisAddress);
        genesisBlock = new Block(0, hash, '', timestamp, [genesisTransaction], genesisMerkleRoot, genesisDifficulty, 0, genesisAddress, genesisStateRoot);
        blockchain = [genesisBlock];
        unspentTxOuts = (0, transaction_1.processTransactions)(blockchain[0].data, [], 0);
        console.log('Genesis block initialized with Quantix address');
        saveBlockchain();
    }
    catch (error) {
        console.error('Error initializing genesis block:', error);
        throw error;
    }
};
exports.initGenesisBlock = initGenesisBlock;
const saveBlockchain = () => {
    try {
        if (!(0, fs_1.existsSync)(DATA_DIR)) {
            (0, fs_1.mkdirSync)(DATA_DIR);
        }
        (0, fs_1.writeFileSync)(BLOCKCHAIN_FILE, JSON.stringify(blockchain));
    }
    catch (e) {
        console.log('Error saving blockchain: ' + e.message);
    }
};
const getBlockchain = () => blockchain;
exports.getBlockchain = getBlockchain;
const getUnspentTxOuts = () => _.cloneDeep(unspentTxOuts);
exports.getUnspentTxOuts = getUnspentTxOuts;
const setUnspentTxOuts = (newUnspentTxOut) => {
    unspentTxOuts = newUnspentTxOut;
    globalState.setUnspentTxOuts(unspentTxOuts);
};
const getLatestBlock = () => blockchain[blockchain.length - 1];
exports.getLatestBlock = getLatestBlock;
const getBlockHeaders = (start, end) => {
    return blockchain
        .slice(start, end)
        .map((block) => ({
        ...block,
        data: []
    }));
};
exports.getBlockHeaders = getBlockHeaders;
const BLOCK_GENERATION_INTERVAL = 300;
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10;
const getDifficulty = (aBlockchain) => {
    const latestBlock = aBlockchain[aBlockchain.length - 1];
    // Emergency Reset: If chain is stuck for > 1 hour, reset difficulty to 1 to allow recovery
    const currentTime = Math.round(new Date().getTime() / 1000);
    const timeSinceLastBlock = currentTime - latestBlock.timestamp;
    if (timeSinceLastBlock > 3600) {
        console.log(`EMERGENCY: Chain stuck for ${timeSinceLastBlock}s. Resetting difficulty to 1.`);
        return 1;
    }
    if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
        return getAdjustedDifficulty(latestBlock, aBlockchain);
    }
    else {
        return latestBlock.difficulty;
    }
};
const getAdjustedDifficulty = (latestBlock, aBlockchain) => {
    const prevAdjustmentBlock = aBlockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
    const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
    const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
    if (timeTaken < 1) {
        return prevAdjustmentBlock.difficulty * 4;
    }
    const multiplier = timeExpected / timeTaken;
    let adjustedDifficulty = prevAdjustmentBlock.difficulty * multiplier;
    if (adjustedDifficulty > prevAdjustmentBlock.difficulty * 4) {
        adjustedDifficulty = prevAdjustmentBlock.difficulty * 4;
    }
    else if (adjustedDifficulty < prevAdjustmentBlock.difficulty / 4) {
        adjustedDifficulty = prevAdjustmentBlock.difficulty / 4;
    }
    return Math.max(Math.floor(adjustedDifficulty), 1);
};
const getCurrentTimestamp = () => Math.round(new Date().getTime() / 1000);
const generateRawNextBlock = async (blockData) => {
    const previousBlock = getLatestBlock();
    const difficulty = getDifficulty(getBlockchain());
    const nextIndex = previousBlock.index + 1;
    const newBlock = findBlock(nextIndex, previousBlock.hash, blockData, difficulty);
    if (newBlock !== null && await addBlockToChain(newBlock)) {
        (0, p2p_1.broadcastLatest)();
        return newBlock;
    }
    else {
        return null;
    }
};
exports.generateRawNextBlock = generateRawNextBlock;
const getMyUnspentTransactionOutputs = () => {
    return (0, wallet_1.findUnspentTxOuts)((0, wallet_1.getPublicFromWallet)(), getUnspentTxOuts());
};
exports.getMyUnspentTransactionOutputs = getMyUnspentTransactionOutputs;
const generateNextBlock = async () => {
    const minterAddress = (0, wallet_1.getPublicFromWallet)();
    const latestBlock = getLatestBlock();
    const nextIndex = latestBlock.index + 1;
    const poolTxs = (0, transactionPool_1.getCandidateTransactions)(50, getUnspentTxOuts());
    const totalFees = poolTxs
        .map((tx) => (0, transaction_1.getTxFee)(tx, getUnspentTxOuts()))
        .reduce((a, b) => a + b, 0);
    const coinbaseTx = (0, transaction_1.getCoinbaseTransaction)(minterAddress, nextIndex, totalFees);
    const blockData = [coinbaseTx].concat(poolTxs);
    return await generateRawNextBlock(blockData);
};
exports.generateNextBlock = generateNextBlock;
const generatenextBlockWithTransaction = async (receiverAddress, amount) => {
    if (!(0, transaction_1.isValidAddress)(receiverAddress)) {
        throw Error('invalid address');
    }
    if (typeof amount !== 'number') {
        throw Error('invalid amount');
    }
    const latestBlock = getLatestBlock();
    const nextIndex = latestBlock.index + 1;
    const minterAddress = (0, wallet_1.getPublicFromWallet)();
    const tx = (0, wallet_1.createTransaction)(receiverAddress, amount, (0, wallet_1.getPrivateFromWallet)(), getUnspentTxOuts(), (0, transactionPool_1.getTransactionPool)());
    const txFee = (0, transaction_1.getTxFee)(tx, getUnspentTxOuts());
    const coinbaseTx = (0, transaction_1.getCoinbaseTransaction)(minterAddress, nextIndex, txFee);
    const blockData = [coinbaseTx, tx];
    return await generateRawNextBlock(blockData);
};
exports.generatenextBlockWithTransaction = generatenextBlockWithTransaction;
const findBlock = (index, previousHash, data, difficulty) => {
    const timestamp = getCurrentTimestamp();
    const merkleRoot = (0, merkle_1.getMerkleRoot)(data);
    const hash = calculateHash(index, previousHash, timestamp, merkleRoot, difficulty, getAccountBalance(), (0, wallet_1.getPublicFromWallet)());
    if (isBlockStakingValid(previousHash, (0, wallet_1.getPublicFromWallet)(), timestamp, getAccountBalance(), difficulty, index)) {
        const currentUTXOs = getUnspentTxOuts();
        const nextUTXOs = (0, transaction_1.processTransactions)(data, currentUTXOs, index);
        const nextState = new state_1.State(nextUTXOs);
        const stateRoot = nextState.getRoot();
        return new Block(index, hash, previousHash, timestamp, data, merkleRoot, difficulty, getAccountBalance(), (0, wallet_1.getPublicFromWallet)(), stateRoot);
    }
    return null;
};
const getAccountBalance = () => {
    return (0, wallet_1.getBalance)((0, wallet_1.getPublicFromWallet)(), getUnspentTxOuts());
};
exports.getAccountBalance = getAccountBalance;
const sendTransaction = (address, amount) => {
    const tx = (0, wallet_1.createTransaction)(address, amount, (0, wallet_1.getPrivateFromWallet)(), getUnspentTxOuts(), (0, transactionPool_1.getTransactionPool)());
    (0, transactionPool_1.addToTransactionPool)(tx, getUnspentTxOuts());
    (0, p2p_1.broadCastTransactionPool)();
    return tx;
};
exports.sendTransaction = sendTransaction;
const calculateHashForBlock = (block) => calculateHash(block.index, block.previousHash, block.timestamp, block.merkleRoot, block.difficulty, block.minterBalance, block.minterAddress);
const calculateHash = (index, previousHash, timestamp, merkleRoot, difficulty, minterBalance, minterAddress) => CryptoJS.SHA256(index + previousHash + timestamp + merkleRoot + difficulty + minterBalance + minterAddress).toString();
const isValidBlockStructure = (block) => {
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
exports.isValidBlockStructure = isValidBlockStructure;
const isValidBlockHeader = (newBlock, previousBlock) => {
    if (!isValidBlockStructure(newBlock)) {
        console.log('invalid block structure: %s', JSON.stringify(newBlock));
        return false;
    }
    if (previousBlock.index + 1 !== newBlock.index) {
        console.log('invalid index');
        return false;
    }
    else if (previousBlock.hash !== newBlock.previousHash) {
        console.log('invalid previoushash');
        return false;
    }
    else if (!isValidTimestamp(newBlock, previousBlock)) {
        console.log('invalid timestamp');
        return false;
    }
    else if (!hasValidHash(newBlock)) {
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
exports.isValidBlockHeader = isValidBlockHeader;
const isValidNewBlock = (newBlock, previousBlock) => {
    if (!isValidBlockHeader(newBlock, previousBlock)) {
        return false;
    }
    if ((0, merkle_1.getMerkleRoot)(newBlock.data) !== newBlock.merkleRoot) {
        console.log('invalid merkle root');
        return false;
    }
    return true;
};
const getAccumulatedDifficulty = (aBlockchain) => {
    return aBlockchain
        .reduce((sum, block) => sum.plus(new bignumber_js_1.BigNumber(2).exponentiatedBy(block.difficulty)), new bignumber_js_1.BigNumber(0));
};
const isValidTimestamp = (newBlock, previousBlock) => {
    return (previousBlock.timestamp - 60 < newBlock.timestamp)
        && newBlock.timestamp - 60 < getCurrentTimestamp();
};
const hasValidHash = (block) => {
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
const hashMatchesBlockContent = (block) => {
    const blockHash = calculateHashForBlock(block);
    return blockHash === block.hash;
};
const isBlockStakingValid = (prevhash, address, timestamp, balance, difficulty, index) => {
    difficulty = difficulty + 1;
    if (index <= mintingWithoutCoinIndex) {
        balance = balance + 1;
    }
    const balanceOverDifficulty = TWO_POW_256.times(balance).dividedBy(difficulty);
    const stakingHash = CryptoJS.SHA256(prevhash + address + timestamp).toString();
    const decimalStakingHash = new bignumber_js_1.BigNumber(stakingHash, 16);
    const difference = balanceOverDifficulty.minus(decimalStakingHash).toNumber();
    return difference >= 0;
};
const isValidChain = async (blockchainToValidate) => {
    console.log('isValidChain:');
    // console.log(JSON.stringify(blockchainToValidate));
    const isValidGenesis = (block) => {
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
    let aUnspentTxOuts = [];
    for (let i = 0; i < blockchainToValidate.length; i++) {
        if (i % 100 === 0) {
            console.log(`Validating block ${i}/${blockchainToValidate.length}`);
            await (0, utils_async_1.yieldToEventLoop)();
        }
        const currentBlock = blockchainToValidate[i];
        let currentState;
        if (i === 0) {
            const genesisUTXOs = (0, transaction_1.processTransactions)(currentBlock.data, [], 0);
            currentState = new state_1.State(genesisUTXOs);
            if (currentBlock.stateRoot && currentBlock.stateRoot !== currentState.getRoot()) {
                throw new validation_errors_1.ValidationError('Genesis State Root mismatch', validation_errors_1.ValidationErrorCode.INVALID_BLOCK_HASH, true);
            }
            aUnspentTxOuts = genesisUTXOs;
        }
        else {
            currentState = new state_1.State(aUnspentTxOuts);
            if (!isValidNewBlock(currentBlock, blockchainToValidate[i - 1])) {
                console.log('isValidChain: Block ' + i + ' is invalid compared to block ' + (i - 1));
                return null;
            }
            try {
                const newState = await execution_1.BlockExecutor.executeBlock(currentBlock, currentState);
                aUnspentTxOuts = newState.getUnspentTxOuts();
            }
            catch (e) {
                console.log('Invalid block execution at index ' + i + ': ' + e.message);
                if (e instanceof validation_errors_1.ValidationError && e.shouldBan)
                    throw e;
                return null;
            }
        }
    }
    return aUnspentTxOuts;
};
const addBlockToChain = async (newBlock) => {
    if (isValidNewBlock(newBlock, getLatestBlock())) {
        try {
            const currentState = new state_1.State(getUnspentTxOuts());
            const newState = await execution_1.BlockExecutor.executeBlock(newBlock, currentState);
            const retVal = newState.getUnspentTxOuts();
            blockchain.push(newBlock);
            setUnspentTxOuts(retVal);
            (0, transactionPool_1.updateTransactionPool)(unspentTxOuts);
            saveBlockchain();
            return true;
        }
        catch (e) {
            console.log('block execution failed', e);
            if (e instanceof validation_errors_1.ValidationError && e.shouldBan)
                throw e;
            return false;
        }
    }
    else {
        return false;
    }
};
exports.addBlockToChain = addBlockToChain;
const getCumulativeDifficulty = (aBlockchain) => {
    return aBlockchain
        .map((block) => new bignumber_js_1.BigNumber(block.difficulty))
        .reduce((a, b) => a.plus(b), new bignumber_js_1.BigNumber(0));
};
exports.getCumulativeDifficulty = getCumulativeDifficulty;
const replaceChain = async (newBlocks) => {
    const newUnspentTxOuts = await isValidChain(newBlocks);
    if (newUnspentTxOuts !== null &&
        getCumulativeDifficulty(newBlocks).gt(getCumulativeDifficulty(blockchain))) {
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        setUnspentTxOuts(newUnspentTxOuts);
        (0, transactionPool_1.updateTransactionPool)(unspentTxOuts);
        (0, p2p_1.broadcastLatest)();
        saveBlockchain();
    }
    else {
        console.log('Received blockchain invalid or not heavier');
    }
};
exports.replaceChain = replaceChain;
const handleReceivedTransaction = (transaction) => {
    (0, transactionPool_1.addToTransactionPool)(transaction, getUnspentTxOuts());
};
exports.handleReceivedTransaction = handleReceivedTransaction;
const getTotalSupply = () => {
    return getUnspentTxOuts()
        .map((uTxO) => uTxO.amount)
        .reduce((a, b) => a + b, 0);
};
exports.getTotalSupply = getTotalSupply;
const getAllBalances = () => {
    const balances = {};
    getUnspentTxOuts().forEach((uTxO) => {
        if (!balances[uTxO.address]) {
            balances[uTxO.address] = 0;
        }
        balances[uTxO.address] += uTxO.amount;
    });
    return balances;
};
exports.getAllBalances = getAllBalances;
//# sourceMappingURL=blockchain.js.map