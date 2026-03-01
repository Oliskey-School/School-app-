
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read settings.json to get the command and args
const settingsPath = path.join(__dirname, '.gemini', 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const supabaseConfig = settings.mcpServers.supabase;

console.log('Starting MCP server with command:', supabaseConfig.command, supabaseConfig.args.join(' '));

const mcpProcess = spawn(supabaseConfig.command, supabaseConfig.args, {
    env: { ...process.env, ...supabaseConfig.env },
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true
});

let outputData = '';
let buffer = '';

function sendJson(obj) {
    const str = JSON.stringify(obj) + '\n';
    console.log('SENDING:', str.trim());
    mcpProcess.stdin.write(str);
}

mcpProcess.stdout.on('data', (data) => {
    const str = data.toString();
    buffer += str;
    
    // Try to split by newlines for JSON-RPC messages
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line

    for (const line of lines) {
        if (!line.trim()) continue;
        console.log('RECEIVED RAW:', line);
        try {
            const json = JSON.parse(line);
            console.log('RECEIVED JSON:', JSON.stringify(json, null, 2));
            handleMessage(json);
        } catch (e) {
            console.log('FAILED TO PARSE LINE:', line);
        }
    }
});

mcpProcess.stderr.on('data', (data) => {
    console.error('SERVER STDERR:', data.toString());
});

function handleMessage(msg) {
    if (msg.id === 1 && msg.result) {
        console.log('✅ Initialization successful!');
        // Send initialized notification
        sendJson({
            jsonrpc: '2.0',
            method: 'notifications/initialized'
        });
        
        // Now request tools
        console.log('Requesting tools...');
        sendJson({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {}
        });
    } else if (msg.id === 2 && msg.result) {
        console.log('✅ Tools received!');
        console.log(JSON.stringify(msg.result, null, 2));
        mcpProcess.kill();
        process.exit(0);
    }
}

// 1. Send initialize request
console.log('Sending initialize request...');
sendJson({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
            name: 'test-client',
            version: '1.0.0'
        }
    }
});

// Timeout after 60 seconds
setTimeout(() => {
    console.log('Timed out waiting for MCP handshake or response.');
    console.log('Buffer content:', buffer);
    mcpProcess.kill();
    process.exit(1);
}, 60000);

mcpProcess.on('exit', (code) => {
    console.log(`MCP Process exited with code ${code}`);
});
