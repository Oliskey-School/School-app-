const { execSync } = require('child_process');

/**
 * Automatically kills processes on specific ports to ensure a clean restart.
 * Supports Windows (netstat/taskkill) and Unix (lsof/kill).
 */
const ports = [3000, 5000];

console.log('🧹 Cleaning up existing server processes...');

ports.forEach(port => {
    try {
        if (process.platform === 'win32') {
            const output = execSync(`netstat -ano | findstr :${port}`).toString();
            const lines = output.split('\n');
            const pids = new Set();
            
            lines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 5) {
                    const pid = parts[parts.length - 1];
                    if (pid && pid !== '0' && !isNaN(pid)) {
                        pids.add(pid);
                    }
                }
            });

            pids.forEach(pid => {
                try {
                    console.log(`🔫 Killing process ${pid} on port ${port}...`);
                    execSync(`taskkill /F /PID ${pid}`);
                } catch (err) {
                    // Process might already be closed
                }
            });
        } else {
            // Unix-like systems
            try {
                execSync(`lsof -t -i:${port} | xargs kill -9`);
                console.log(`🔫 Killed process on port ${port}`);
            } catch (err) {
                // No process found
            }
        }
    } catch (err) {
        // No process found on this port, which is fine
    }
});

console.log('✅ Port cleanup complete.');
