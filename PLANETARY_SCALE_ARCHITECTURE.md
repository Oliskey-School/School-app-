# Planetary Scale Load Balancing Architecture (200+ Billion RPS)

Reaching **200 Billion users per second** (RPS) is far beyond the capacity of any single machine or even a single data center. For context, Google Search handles roughly 100,000 queries per second, meaning your requirement is **2 million times larger than Google's global search volume**. 

To ensure the app does not lag or crash under such extreme load, you must adopt a **distributed, planetary-scale architecture**. We have provided local scaling components (`backend/src/cluster.ts`, `ecosystem.config.js`, and `nginx-load-balancer.conf`), but to scale this to 200 billion RPS, you will need the following infrastructure:

## 1. Global Anycast DNS Routing & Edge Caching (Tier 1)
- **Cloudflare / AWS Route 53 / Akamai:** You must use Anycast DNS to route users to the geographically closest edge location.
- **CDN Caching:** 99.9% of traffic (static assets, heavily read data) MUST be cached at the edge network (CDN). No request for static data should ever reach your Node.js servers.
- **Edge Compute (Cloudflare Workers / AWS Lambda@Edge):** Perform basic authentication, rate-limiting, and bot-protection at the edge network using serverless functions.

## 2. Regional Load Balancers (Tier 2)
- **AWS Application Load Balancers (ALB) / Google Cloud Load Balancing:** Distributed globally. The edge network forwards dynamic requests to regional load balancers.
- **L4/L7 Load Balancing:** Use Layer 4 (Network) routing for raw TCP/UDP speed, then Layer 7 (Application) to route specific API endpoints.

## 3. Massively Horizontally Scaled Microservices (Tier 3)
- **Kubernetes (K8s):** The application must be containerized (`Docker`). You will need hundreds of K8s clusters deployed across dozens of global data centers.
- **Horizontal Pod Autoscaling (HPA):** Automatically spawn new Node.js instances based on CPU and Memory usage.
- **Node.js Cluster Mode (Provided):** Even within K8s, each container should use the `cluster` module (see `backend/src/cluster.ts` or `ecosystem.config.js` we created) to ensure maximum usage of the container's allocated CPU cores.

## 4. Distributed Data Layer (Tier 4)
- **Database Load Balancing:** A single PostgreSQL database will crash instantly. You need:
  - **Connection Pooling:** `PgBouncer` to manage database connections.
  - **Read Replicas:** Thousands of read-only database replicas.
  - **Sharding & Partitioning:** Split data across multiple database instances based on Region or User ID (e.g., Citus for PostgreSQL, or switch to a NoSQL like Cassandra/DynamoDB or a NewSQL like CockroachDB/Google Spanner for global write scalability).
- **In-Memory Cache:** A massive, distributed Redis/Memcached cluster to cache database queries and user sessions.

## Local Improvements We Implemented For You:
While building the planetary infrastructure requires AWS/GCP, we have optimized your current repository to be as fast and crash-proof as possible:

1. **`backend/src/cluster.ts`:** We implemented a Node.js Native Cluster. It spans your app across every CPU core on the machine. If a worker process crashes, the Master instantly respawns it (Zero-Downtime self-healing).
2. **`ecosystem.config.js`:** We added a PM2 configuration for production-grade process management and load balancing.
3. **`nginx-load-balancer.conf`:** We added an ultra-optimized NGINX configuration designed for high concurrency. It includes DDoS protection, least-connection routing, and aggressive buffering.

### How to test the local clustering:
```bash
# Using standard Node cluster
npx tsx backend/src/cluster.ts

# OR using PM2 (Industry standard)
npm install -g pm2
pm2 start ecosystem.config.js
```
