"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPeerInfo = exports.getSockets = exports.initP2PServer = exports.broadCastTransactionPool = exports.broadcastLatest = exports.connectToPeers = void 0;
const ws_1 = __importDefault(require("ws"));
const blockchain_1 = require("./blockchain");
const transactionPool_1 = require("./transactionPool");
const validation_errors_1 = require("./validation_errors");
const peerManager_1 = require("./peerManager");
const sockets = [];
const knownPeers = new Set();
const pendingPeers = new Set();
const peerHeights = new Map();
var MessageType;
(function (MessageType) {
    MessageType[MessageType["QUERY_LATEST"] = 0] = "QUERY_LATEST";
    MessageType[MessageType["QUERY_ALL"] = 1] = "QUERY_ALL";
    MessageType[MessageType["RESPONSE_BLOCKCHAIN"] = 2] = "RESPONSE_BLOCKCHAIN";
    MessageType[MessageType["QUERY_TRANSACTION_POOL"] = 3] = "QUERY_TRANSACTION_POOL";
    MessageType[MessageType["RESPONSE_TRANSACTION_POOL"] = 4] = "RESPONSE_TRANSACTION_POOL";
    MessageType[MessageType["QUERY_HEADERS"] = 5] = "QUERY_HEADERS";
    MessageType[MessageType["RESPONSE_HEADERS"] = 6] = "RESPONSE_HEADERS";
    MessageType[MessageType["QUERY_BLOCK_DATA"] = 7] = "QUERY_BLOCK_DATA";
    MessageType[MessageType["RESPONSE_BLOCK_DATA"] = 8] = "RESPONSE_BLOCK_DATA";
})(MessageType || (MessageType = {}));
class Message {
}
const initP2PServer = (p2pPort) => {
    const server = new ws_1.default.Server({ port: p2pPort });
    server.on('connection', (ws, req) => {
        const ip = req.socket.remoteAddress;
        if (peerManager_1.peerManager.isBanned(ip)) {
            console.log('Rejected connection from banned peer: ' + ip);
            ws.close();
            return;
        }
        initConnection(ws);
    });
    console.log('listening websocket p2p port on: ' + p2pPort);
    // Keep-alive/Reconnection loop
    setInterval(() => {
        knownPeers.forEach((peer) => {
            const isConnected = sockets.find((s) => s.url === peer);
            if (!isConnected && !pendingPeers.has(peer)) {
                console.log('Reconnecting to peer: ' + peer);
                connectToPeers(peer);
            }
        });
    }, 5000);
    // Active Resynchronization Loop
    // Explicitly ask peers for their latest block state every 10 seconds
    setInterval(() => {
        // No longer returning early if getSyncStatus() is true, 
        // to avoid deadlocks if a sync-peer disconnects.
        const latestBlockHeld = (0, blockchain_1.getLatestBlock)();
        const latestIndex = latestBlockHeld.index;
        // Check if we are behind any peer
        sockets.forEach(ws => {
            const peerHeight = peerHeights.get(ws) || 0;
            if (peerHeight > latestIndex) {
                console.log(`Active Sync: Local height ${latestIndex} < Peer height ${peerHeight}. Requesting blocks...`);
                write(ws, queryBlockDataMsg(latestIndex + 1, 200));
            }
            else {
                // Or just ping to check if they have new stuff (optional, but good for liveness)
                write(ws, queryChainLengthMsg());
            }
        });
    }, 30000);
};
exports.initP2PServer = initP2PServer;
const getSockets = () => sockets;
exports.getSockets = getSockets;
const initConnection = (ws) => {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, queryChainLengthMsg());
    setTimeout(() => {
        broadcast(queryTransactionPoolMsg());
    }, 500);
};
const JSONToObject = (data) => {
    try {
        return JSON.parse(data);
    }
    catch (e) {
        console.log(e);
        return null;
    }
};
const initMessageHandler = (ws) => {
    ws.on('message', (data) => {
        try {
            const message = JSONToObject(data);
            if (message === null) {
                console.log('could not parse received JSON message: ' + data);
                return;
            }
            // console.log('Received message: %s', JSON.stringify(message));
            console.log('Received message type: ' + message.type);
            if (message.type === MessageType.QUERY_LATEST) {
                write(ws, responseLatestMsg());
            }
            else if (message.type === MessageType.QUERY_ALL) {
                write(ws, responseChainMsg());
            }
            else if (message.type === MessageType.RESPONSE_BLOCKCHAIN) {
                const receivedBlocks = JSONToObject(message.data);
                if (receivedBlocks === null) {
                    console.log('invalid blocks received: %s', JSON.stringify(message.data));
                    return;
                }
                console.log('Received blockchain response. Count: ' + receivedBlocks.length);
                if (receivedBlocks.length > 0) {
                    console.log('Range: ' + receivedBlocks[0].index + ' -> ' + receivedBlocks[receivedBlocks.length - 1].index);
                }
                handleBlockchainResponse(receivedBlocks, ws);
            }
            else if (message.type === MessageType.QUERY_TRANSACTION_POOL) {
                write(ws, responseTransactionPoolMsg());
            }
            else if (message.type === MessageType.RESPONSE_TRANSACTION_POOL) {
                const receivedTransactions = JSONToObject(message.data);
                if (receivedTransactions === null) {
                    console.log('invalid transaction received: %s', JSON.stringify(message.data));
                    return;
                }
                receivedTransactions.forEach((transaction) => {
                    try {
                        (0, blockchain_1.handleReceivedTransaction)(transaction);
                        broadcast(responseTransactionPoolMsg());
                    }
                    catch (e) {
                        console.log(e.message);
                    }
                });
            }
            else if (message.type === MessageType.QUERY_HEADERS) {
                write(ws, responseHeadersMsg());
            }
            else if (message.type === MessageType.RESPONSE_HEADERS) {
                const receivedHeaders = JSONToObject(message.data);
                if (receivedHeaders === null) {
                    console.log('invalid headers received: %s', JSON.stringify(message.data));
                    return;
                }
                handleBinHeadersResponse(receivedHeaders, ws);
            }
            else if (message.type === MessageType.QUERY_BLOCK_DATA) {
                const { fromIndex, limit } = message.data || { fromIndex: 0, limit: 1 };
                const blocks = (0, blockchain_1.getBlocks)(fromIndex, fromIndex + limit);
                console.log(`Serving blocks ${fromIndex} to ${fromIndex + limit} (found: ${blocks.length})`);
                write(ws, responseBlockDataMsg(blocks));
            }
            else if (message.type === MessageType.RESPONSE_BLOCK_DATA) {
                const receivedBlocks = JSONToObject(message.data);
                if (receivedBlocks === null) {
                    console.log('invalid block data received');
                    return;
                }
                handleBlockDataResponse(receivedBlocks, ws);
            }
        }
        catch (e) {
            console.log(e);
        }
    });
};
const getPeerInfo = () => {
    return sockets.map(s => ({
        url: s.url || s._socket.remoteAddress + ':' + s._socket.remotePort,
        height: peerHeights.get(s) || 0
    }));
};
exports.getPeerInfo = getPeerInfo;
const write = (ws, message) => {
    if (ws.readyState === ws_1.default.OPEN) {
        ws.send(JSON.stringify(message));
    }
};
const broadcast = (message) => sockets.forEach((socket) => write(socket, message));
const queryChainLengthMsg = () => ({ 'type': MessageType.QUERY_LATEST, 'data': null });
const queryAllMsg = () => ({
    'type': MessageType.QUERY_ALL,
    'data': null
});
const queryBlockDataMsg = (fromIndex, limit) => ({
    'type': MessageType.QUERY_BLOCK_DATA,
    'data': { fromIndex, limit }
});
const responseChainMsg = () => {
    const blockchain = (0, blockchain_1.getBlockchain)();
    // Low RAM: If the blockchain is too long, don't send the full thing at once
    // Peer should use chunked sync (QUERY_BLOCK_DATA) instead.
    if (blockchain.length > 50) {
        console.log(`P2P: Chain too long (${blockchain.length}). Sending only latest 50 blocks.`);
        return {
            'type': MessageType.RESPONSE_BLOCKCHAIN,
            'data': JSON.stringify(blockchain.slice(blockchain.length - 50))
        };
    }
    return {
        'type': MessageType.RESPONSE_BLOCKCHAIN,
        'data': JSON.stringify(blockchain)
    };
};
const responseLatestMsg = () => ({
    'type': MessageType.RESPONSE_BLOCKCHAIN,
    'data': JSON.stringify([(0, blockchain_1.getLatestBlock)()])
});
const responseBlockDataMsg = (blocks) => ({
    'type': MessageType.RESPONSE_BLOCK_DATA,
    'data': JSON.stringify(blocks)
});
const queryTransactionPoolMsg = () => ({
    'type': MessageType.QUERY_TRANSACTION_POOL,
    'data': null
});
const responseTransactionPoolMsg = () => ({
    'type': MessageType.RESPONSE_TRANSACTION_POOL,
    'data': JSON.stringify((0, transactionPool_1.getTransactionPool)())
});
const queryHeadersMsg = () => ({
    'type': MessageType.QUERY_HEADERS,
    'data': null
});
const responseHeadersMsg = () => ({
    'type': MessageType.RESPONSE_HEADERS,
    'data': JSON.stringify((0, blockchain_1.getBlockHeaders)(0, (0, blockchain_1.getBlockchain)().length))
});
const initErrorHandler = (ws) => {
    const closeConnection = (myWs) => {
        console.log('connection failed to peer: ' + myWs.url);
        sockets.splice(sockets.indexOf(myWs), 1);
    };
    ws.on('close', () => closeConnection(ws));
    ws.on('error', () => closeConnection(ws));
};
const closeConnection = (myWs) => {
    console.log('connection failed to peer: ' + myWs.url);
    sockets.splice(sockets.indexOf(myWs), 1);
    peerHeights.delete(myWs);
};
const banPeer = (ws, reason) => {
    const ip = ws._socket.remoteAddress;
    console.log(`Banning peer ${ip} for: ${reason}`);
    peerManager_1.peerManager.banPeer(ip);
    ws.close();
};
const punishPeer = (ws, penaltyType) => {
    const ip = ws._socket.remoteAddress;
    if (penaltyType === 'BLOCK')
        peerManager_1.peerManager.punishInvalidBlock(ip);
    else if (penaltyType === 'TX')
        peerManager_1.peerManager.punishInvalidTransaction(ip);
    else if (penaltyType === 'SPAM')
        peerManager_1.peerManager.punishSpam(ip);
    if (peerManager_1.peerManager.isBanned(ip)) {
        ws.close();
    }
};
const handleBlockDataResponse = async (receivedBlocks, ws) => {
    if (receivedBlocks.length === 0) {
        console.log('Received block data size of 0. Peer might be at same height or has different chain.');
        return;
    }
    // Sort just in case
    receivedBlocks.sort((a, b) => a.index - b.index);
    console.log(`Received chunk of ${receivedBlocks.length} blocks. Range: ${receivedBlocks[0].index} to ${receivedBlocks[receivedBlocks.length - 1].index}. Processing...`);
    let blocksAdded = 0;
    for (const block of receivedBlocks) {
        const latestBlockHeld = (0, blockchain_1.getLatestBlock)();
        if (block.index === latestBlockHeld.index + 1) {
            if (latestBlockHeld.hash === block.previousHash) {
                // Happy path: Append
                try {
                    if (await (0, blockchain_1.addBlockToChain)(block)) {
                        blocksAdded++;
                    }
                    else {
                        console.log(`Failed to add block ${block.index} to chain (validation failed)`);
                        break; // Stop processing this chunk if a block fails
                    }
                }
                catch (e) {
                    console.log(`Error adding block ${block.index}: ${e.message}`);
                    punishPeer(ws, 'BLOCK');
                    return;
                }
            }
            else {
                console.log(`Block ${block.index} previous hash mismatch. Wanted ${latestBlockHeld.hash}, got ${block.previousHash}`);
                return;
            }
        }
        else if (block.index > latestBlockHeld.index + 1) {
            console.log(`Received block ${block.index} but we are at ${latestBlockHeld.index}. Gap detected.`);
            break;
        }
        else {
            // Already have it
            // console.log(`Ignored block ${block.index} (already have ${latestBlockHeld.index})`);
        }
    }
    console.log(`Processed chunk: ${blocksAdded} blocks added.`);
    // After processing chunk, check if we need more
    const latestHeight = (0, blockchain_1.getLatestBlock)().index;
    const peerHeight = peerHeights.get(ws) || 0;
    if (latestHeight < peerHeight) {
        // If we didn't add any blocks but we are behind, and there was no error, we might be stuck.
        if (blocksAdded === 0 && receivedBlocks.length > 0) {
            console.log(`WARNING: No blocks were added from a chunk of ${receivedBlocks.length}. Potential sync stalemate at height ${latestHeight}.`);
            // To avoid rapid-fire requests when stuck, we could add a delay or stop here.
            // For now, we will try again after a short delay.
            return;
        }
        console.log(`Sync continued: ${latestHeight} / ${peerHeight}. Requesting next chunk...`);
        const nextChunkSize = 200; // Increased chunk size for faster sync
        write(ws, queryBlockDataMsg(latestHeight + 1, nextChunkSize));
    }
    else {
        console.log(`Sync finished or caught up with peer at height ${latestHeight}.`);
        await (0, blockchain_1.saveBlockchain)(true);
    }
};
const handleBlockchainResponse = async (receivedBlocks, ws) => {
    if (receivedBlocks.length === 0) {
        console.log('received block chain size of 0');
        return;
    }
    const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    peerHeights.set(ws, latestBlockReceived.index);
    if (!(0, blockchain_1.isValidBlockStructure)(latestBlockReceived)) {
        console.log('block structuture not valid');
        return;
    }
    const latestBlockHeld = (0, blockchain_1.getLatestBlock)();
    if (latestBlockReceived.index > latestBlockHeld.index) {
        console.log('blockchain possibly behind. We got: '
            + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            try {
                if (await (0, blockchain_1.addBlockToChain)(latestBlockReceived)) {
                    broadcast(responseLatestMsg());
                }
            }
            catch (e) {
                if (e instanceof validation_errors_1.ValidationError && e.shouldBan) {
                    banPeer(ws, e.message);
                    return;
                }
                punishPeer(ws, 'BLOCK');
                console.log('Error adding block: ' + e.message);
            }
        }
        else if (receivedBlocks.length === 1) {
            console.log('We have to query the chain from our peer');
            // If we received a single block that is ahead but doesn't link, we need to sync from our current height + 1
            write(ws, queryBlockDataMsg(latestBlockHeld.index + 1, 50));
        }
        else {
            console.log('Received blockchain is longer than current blockchain');
            // If we get here, it means we got a full chain response or a chunk that didn't match partial logic. 
            // Trust our batch logic for sync. If the peer sends us a full chain, we might want to ignore it 
            // if we are using batch sync, OR we can try to replace if valid (but replaceChain is heavy).
            // Better to trigger batch sync.
            write(ws, queryBlockDataMsg(latestBlockHeld.index + 1, 50));
        }
    }
    else {
        // console.log('received blockchain is not longer than received blockchain. Do nothing');
    }
};
const handleBinHeadersResponse = async (receivedHeaders, ws) => {
    if (receivedHeaders.length === 0) {
        console.log('received headers size of 0');
        return;
    }
    console.log('Received headers. Count: ' + receivedHeaders.length);
    const latestHeader = receivedHeaders[receivedHeaders.length - 1];
    const latestHeldBlock = (0, blockchain_1.getLatestBlock)();
    // Update peer height knowledge
    peerHeights.set(ws, latestHeader.index);
    // Get current height after potential block additions from other peers
    const currentHeight = (0, blockchain_1.getLatestBlock)().index;
    if (latestHeader.index > currentHeight) {
        // If the peer's latest header is greater than our current height, we might be behind.
        // We use `currentHeight` here to ensure we're always comparing against the most up-to-date chain height.
        console.log(`Peer has better chain (height ${latestHeader.index}). Starting batch sync from ${currentHeight + 1}`);
        write(ws, queryBlockDataMsg(currentHeight + 1, 200));
    }
};
const broadcastLatest = () => {
    broadcast(responseLatestMsg());
};
exports.broadcastLatest = broadcastLatest;
const connectToPeers = (newPeer) => {
    // Avoid connecting to self? (Assumption: user manages peer list)
    if (getSockets().find((s) => s.url === newPeer)) {
        return;
    }
    knownPeers.add(newPeer);
    if (pendingPeers.has(newPeer)) {
        console.log('Peer connect already pending: ' + newPeer);
        return;
    }
    console.log('Attempting connection to peer: ' + newPeer);
    pendingPeers.add(newPeer);
    const ws = new ws_1.default(newPeer);
    ws.on('open', () => {
        console.log('Connect to peer success: ' + newPeer);
        pendingPeers.delete(newPeer);
        initConnection(ws);
        write(ws, queryHeadersMsg());
    });
    ws.on('error', (err) => {
        console.log('Connection failed to ' + newPeer + ' Error: ' + err.message);
        pendingPeers.delete(newPeer);
    });
    ws.on('close', () => {
        pendingPeers.delete(newPeer);
    });
};
exports.connectToPeers = connectToPeers;
const broadCastTransactionPool = () => {
    broadcast(responseTransactionPoolMsg());
};
exports.broadCastTransactionPool = broadCastTransactionPool;
//# sourceMappingURL=p2p.js.map