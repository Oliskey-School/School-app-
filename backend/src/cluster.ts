import cluster from 'cluster';
import os from 'os';

// Highly Scalable Cluster Manager for School SaaS App
// Goal: Maximize CPU utilization and provide zero-downtime restarts.

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
    console.log(`🌍 [Master] Node Cluster Master ${process.pid} is running`);
    console.log(`📈 [Load Balancer] Initializing ${numCPUs} worker processes to handle massive concurrent traffic...`);

    // Fork workers for each CPU core
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // Auto-Restart Workers if they die (Self-Healing)
    cluster.on('exit', (worker, code, signal) => {
        console.error(`💥 [Master] Worker ${worker.process.pid} died (Code: ${code}, Signal: ${signal})`);
        console.log(`🔄 [Master] Spawning a new worker to maintain high availability...`);
        cluster.fork();
    });

    // Optional: Listen for messages from workers (e.g., custom metrics)
    cluster.on('message', (worker, message) => {
        if (message.type === 'HEALTH_CHECK') {
            // Handle health reporting for global load balancers (AWS ALB, Cloudflare, etc.)
        }
    });

} else {
    // Workers share the TCP connection
    console.log(`👷 [Worker] Worker ${process.pid} started and ready for traffic.`);
    
    // Import and start the actual Express server
    // It will automatically bind to the shared port across all processes.
    require('./server');
}
