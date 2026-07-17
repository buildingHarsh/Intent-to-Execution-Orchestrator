🪐 NexusFabric: AI-Driven Intent Orchestration Engine

NexusFabric is an enterprise-grade orchestration platform that transforms fragmented, natural-language business intents (e.g., "Refund order 123 and notify the customer") into safely executable, auditable, and human-validated workflow pipelines.

Instead of hardcoding workflows or exposing raw databases to AI, NexusFabric uses a Model Context Protocol (MCP) server to generate execution plans safely, stores them in PostgreSQL, and processes them through a loosely-coupled MuleSoft integration layer using asynchronous webhooks and concurrency-safe polling.

🚀 The Problem It Solves

Enterprise automation often suffers from hidden manual steps, fragile point-to-point API scripts, and unsafe AI executions. NexusFabric solves this by separating Intent, Policy, Execution, and Adapters:

Intent: AI translates natural language into a strict JSON execution graph.

Policy: Human-in-the-loop (HITL) safety gates freeze high-risk actions pending operator approval.

Execution: A Node.js orchestration loop guarantees exactly-once execution using pessimistic database locking.

Adapter: A stateless MuleSoft runtime abstracts away the complexities of downstream APIs.

🏗️ Architecture & Data Flow

+----------------+      (1) Natural Language       +-------------------------+
|                | ------------------------------> |                         |
|   SvelteKit    |                                 |   Node.js Orchestrator  |
|   Dashboard    | <------------------------------ |   (Web API & Run-Loop)  |
|   (Port 5173)  |      (6) Web Sockets / API      |   (Port 3002)           |
+----------------+                                 +-------------------------+
       | (4) HITL Approvals                              | (5) Dispatch  ^ (8) Async
       v                                                 v               | Callback
+----------------+      (2) Plan Intent            +-------------------------+
|                | ------------------------------> |                         |
|   MCP Server   |                                 |   MuleSoft Runtime      |
|   (Node.js)    | <------------------------------ |   (Stateless Adapters)  |
+----------------+      (3) Insert Execution Graph |   (Port 8081)           |
       |                                           +-------------------------+
       |                                                 |               ^
       v                                                 v (7) HTTP Call |
+----------------+                                 +-------------------------+
|                |                                 |                         |
|   PostgreSQL   |                                 |   Mock Corporate APIs   |
|   (Port 5432)  |                                 |   (CRM, Billing, Email) |
|                |                                 |   (Port 3001)           |
+----------------+                                 +-------------------------+


Key Engineering Features

Pessimistic Locking (FOR UPDATE SKIP LOCKED): Prevents race conditions and double-executions if the Node.js orchestrator scales horizontally.

Asynchronous Webhooks: MuleSoft returns an immediate 202 Accepted and processes data in the background, preventing Node.js socket timeouts on long-running tasks.

Fault Isolation: try/catch wrappers and MuleSoft On Error Propagate blocks ensure that a downstream API outage fails only the specific task, without crashing the orchestration loop.

Immutable Audit Trail: Every state change, approval, and failure generates a cryptographic-style log in the database.

💻 Tech Stack

Frontend: SvelteKit (Native CSS, no external UI frameworks)

AI Tooling: Model Context Protocol (@modelcontextprotocol/sdk)

Database: PostgreSQL (pg)

Orchestration / Backend: Node.js, Express

Integration Layer: MuleSoft (Anypoint Code Builder, OAS 3.0)

🗺️ Network Port Map

To run this distributed system locally, ensure the following ports are free:

3001: Mock Target APIs (Express)

3002: Node.js Orchestrator API & Webhook Listener

5173: SvelteKit Operator Console

5432: PostgreSQL Database

8081: MuleSoft Integration Runtime (HTTP Listener)

🛠️ Local Setup & Installation

1. Database Setup

Ensure PostgreSQL is running on port 5432. Create a database named nexus_fabric and run the initialization schema:

CREATE TABLE intents ( id SERIAL PRIMARY KEY, prompt TEXT NOT NULL, status VARCHAR(50) DEFAULT 'PENDING', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );
CREATE TABLE execution_steps ( id SERIAL PRIMARY KEY, intent_id INT REFERENCES intents(id) ON DELETE CASCADE, step_order INT NOT NULL, target_system VARCHAR(100) NOT NULL, action_name VARCHAR(100) NOT NULL, payload JSONB DEFAULT '{}', status VARCHAR(50) DEFAULT 'PENDING', error_message TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP );
CREATE TABLE audit_logs ( id SERIAL PRIMARY KEY, intent_id INT REFERENCES intents(id) ON DELETE CASCADE, step_id INT REFERENCES execution_steps(id) ON DELETE SET NULL, actor VARCHAR(100) DEFAULT 'SYSTEM', action_taken TEXT NOT NULL, payload_snapshot JSONB, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP );


2. Mock Infrastructure

cd mock-infrastructure
npm install
node server.js # Starts on Port 3001


3. MuleSoft Adapter Runtime

Open VS Code with the Anypoint Code Builder extension.

Import the nexus-adapter-runtime project.

Deploy the application locally (runs on Port 8081).

4. Node.js Orchestrator & Webhooks

cd nexus-orchestrator
npm install
node worker.js # Starts loop & API on Port 3002


5. SvelteKit Console

cd nexus-console
npm install
npm run dev # Starts on Port 5173


🧪 Testing Scenarios

Refer to the included testing_guide.md for a comprehensive step-by-step walkthrough, but here are the primary scenarios supported out of the box:

The Happy Path (Automated): Input "Process a refund of $45 for order #123". Watch the AI break it into CRM Verify, Billing Refund, and Email tasks, executing sequentially.

The Safety Gate (HITL): Input "Process a HIGH VALUE refund of $5000". The system will halt at the Billing step, placing it in AWAITING_APPROVAL until a human clicks "Approve" in the Svelte UI.

Catastrophic Outage: Kill the Mock API server mid-run. MuleSoft will trap the connection error, use the Async Webhook to report the failure back to Node.js, and safely halt the specific workflow without crashing the engine.

