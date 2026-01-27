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
const GENESIS_ADDRESS = 'd6476783921bb833695660ab9534806c1f4459803a5427d1c0eee28b62abde0c9e76748e3b52b24f81f4626fe3436d974f182d06ac329752fa259db08d7906c5105b0d5aff999bba3a0195dd6da48bce1ca60b79095a7baa65df859493259fd4962ded8bbf5e8e433ca1cd53e00ef6fd6edf845fc86ca5c985353daf1299351126e81e77e9a52a20196eb62c3b855beab38ab1600107a7649dcab75a5a0898fdd0c1bdf988d6dbdf3e957f2047712c45c1c3a5ceaa2c449c1c90001181e701c7aa00e651b7873dd30320ebe61b4233428cc3c104a40ee7f14af5a58b0b825b746fefbbe3c188d68b511f683cd69348819d8d2744f0966981e1eadd645bacb3d2e0c35f01e66e029f3d010f5ee4b5a892fb4a5c20b3b68970e6a0eed64e2b72550708197b91af990d3e743671b1ef4eb24aa1815cfd525e60a0a67ea7a184e54a7e21fffeac67e8354010a2bc89c82931e0e3540d0a1c4770efe1635fff8e30e29cc4cb31690b95292bdb101499a67888f4bd9e144066c1aaab61b176fbd04b193e9c6c45119cb8ae93a35b6cdc6323bf51f25a091092dc814991ebb1961460df98711c08d117f88bba00d9932429a3432e53a50cb50f656c1e2891686d693d8ecd9b7a2c02eb91052194b2ce4af18cf3f9fa8e93f33d62b7cb8491527b89ca0d99c3e06380fa4ede68f418bd5730fcfdde75411c7b31b9359429269bb481592b1f5dd5816e73c9da82a563961babd25b2ecd42a741b36f6a9e5b810e330e204fc6551edd5b5fb577fa58b42a85b7152e978382ac8a25b3d6ee43168c5c70b5e2912579a8f6924becd2f51682e5893f05e10288d37de27f4bcda790934b025e90219b1e95ad61904a3a732515709f7571668daf6707491651e267bd73987c350c25f4d03ad1c86694c09c73f0620475128fdb73a47b70ecbc9ea8748070787b02d31cc9c58838f4a1e4e5b10a00d85b65944b48d8dd98e5386b4a5e94a9b3a83fc5d8c3d95c934a4a4c19b37aa8344f6b9267c096e1529c14f9b321ff4b594ad74d0df0aafa383a36d6d0111e72c22037a33b61f5b7ed22f7a9711df6a69fe656866a511e48d6c5375c39bd7f4a0b4e7a754dd42533f0906063492a8d01ce4da6bb8e66570ca005363f438e8c4b3e84b213142e80aee7cdea7cc59ecffcb3f82ccafd56fb778e6bbd4837f0de3888e28ca9ecd8a63c4efd516ef6732ee7fd7d33a8ccf849294ba21d78eed6604b2fa2d7d602ace5d3faee662657ee040605d2dc7c487f4bdaccdd89214f3a97bc4c21ed5091a88764fe9ef84125dd0f77c4b98f7aa88c5b86f12e21de50e1e206249cedb18528b2f9abb9d429a2ca0b1c40bea19cfbe03deb5b5f4b72e32977ffce4a7ae96674a022d3a6bf8bcdb8d566b80b7280ff917a0c1237e17c0fc32ed86c8c1a782dfbaa0c72ad2022d3a6bf8bcdb8d566b80b7280ff917a0c1237e17c0fc32ed86c8c1a782dfbaa0c72ad2026b9fdf46cb5d54a4ea7f6f937541e46476c1f8a1911a8fc8c0b579e6514a3fb734c2efc404bee44c1fc58ea7fe0d84a37b90bcd2dc82e4c6e8b5ec693c54d572efc9dce125c37bbde1176efd934a26c24498ef1dba00d66b65140bfae9e86dfaf10faf96224d5ab4534814d040c5253f8253f9d72b6ec243166e97a8ee48aae90ed0768987c1313629ce1a5afddba879b192e8359b9711ebf36578a77fc2fc494b9544dffe77ae7b3702bc6f9f79b8bf22e3966b569ff33e65895530845547ce36872bcc3f1a5ad6be04cd8895626c0a977043f0b8620e10478052c0bb990994bcff435a05591b49868a443482f893e1405dabf2f669ddd36b56ef19ba390dceaff7e2b40028c400c1a6a062418f3a83f212f58597198f0af4f511f3019e20cebaaed59f0654ff3cac650945c64e67bc4d82104b23081e889eb063ced163e8f78f67b8b1895b0519864d61343094131f2d5dab84c47648761a19a9c84574b94e74df5bb812e1d696d05600a74b867c1e04908caa79cd165e075f18695102d72faba1ed919ecf4efb483265252ac0fb6ee897a6f02dc22f1427badc397fbf14201df2dd9f52dde20794bb2783332ef441843be93f2d1271699da56ed0dc33ed8c79a48a950c289f077e20511d4536b9bb0ac9a6086d9897a0f62ec1cad8979222cbf677883fefb9081bb72169cffb0274c635555724be2659c109fb312dcc37edce8a39b835f122e6b900d6b2f91cdd49279d88a5dd17506488139d287920843cb471a556438bd6e862371af54210b6a23b995d653e8b9a9dc9331addd1817e2c0347fa5d2174c9f6304a149ad543d09b0c3c3e3e7ccce7da79646fdb29028315aa286b28a980dbd629726f900bda46fcc49ffa42c50e51a5168e94f29a0907fb48613d36f50b7683acda8a1dae0ca59d8a76035d250fb5aa0c3ed27c0f5f238f8787888ca57b4f315b3aab5387771afe492069a178366eb64a5547ea66c268d6a60ba857079124d42bcaa5ed7ef64752b0a52c273f9cba8edc0aa2c6814cb307744c35e5b84cf904e7ea482befda66522a40911767c4503f54b7caf4fdaea22f56d3ad25ae54fdcb6a8cc9419e6bd5da7af8d81ef6208475198b249a42282dbb15e78528347cddc4f8da1d1132552e1f6fd388205a4f029f90023c64294064cf5316c6f87fbdf07f1b266f1b4b9ead71ad29b3237f96aaf8034891f5e705938f4184613e4ce38b8cd2693b16566c79ef91695985e670648dc671f48a1ed7d9b51a48389a3427fe809e3bb72f2685f19f5b60e24fa0af5397faf565de5a0f9c4c128c474f4d54872';
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
    console.log(JSON.stringify(blockchainToValidate));
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
        if (i % 10 === 0) {
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