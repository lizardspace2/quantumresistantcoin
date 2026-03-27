module.exports = {
    apps: [
        {
            name: 'quantix-node',
            script: 'src/main.js',
            node_args: '--max-old-space-size=1536',
            env: {
                HTTP_PORT: 3001,
                P2P_PORT: 6001,
                PEERS: 'ws://35.225.236.73:6001',
                ENABLE_MINING: 'false',
                SAFE_MODE: 'true'
            },
            restart_delay: 5000,
            exp_backoff_restart_delay: 100,
            max_restarts: 30,
            time: true
        }
    ]
};
