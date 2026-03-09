module.exports = {
    apps: [
        {
            name: 'quantix-node',
            script: 'src/main.ts',
            interpreter: 'ts-node',
            env: {
                HTTP_PORT: 3001,
                P2P_PORT: 6001,
                PEERS: 'ws://35.225.236.73:6001,ws://136.115.214.0:6001'
            },
            restart_delay: 5000,
            max_restarts: 10,
            out_file: 'logs/out.log',
            error_file: 'logs/error.log',
            merge_logs: true,
            time: true
        }
    ]
};
