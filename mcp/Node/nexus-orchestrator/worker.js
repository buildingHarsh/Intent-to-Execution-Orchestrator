// worker.js
const pg = require('pg');

// Database configuration connection pool configured directly inside the file
const pool = new pg.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'nexus_fabric',
    password: process.env.DB_PASSWORD || 'root',
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function processNextStep() {
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        
        // 1. Fetch the next step with a Pessimistic Lock.
        const res = await client.query(`
            SELECT * FROM execution_steps 
            WHERE status = 'APPROVED' 
              AND intent_id NOT IN (
                  SELECT intent_id FROM execution_steps WHERE status IN ('RUNNING', 'FAILED')
              )
            ORDER BY step_order ASC LIMIT 1 
            FOR UPDATE SKIP LOCKED;
        `);

        if (res.rows.length === 0) {
            await client.query('ROLLBACK');
            return;
        }

        const step = res.rows[0];

        // 2. Claim the step immediately to block other loops
        await client.query("UPDATE execution_steps SET status = 'RUNNING' WHERE id = $1", [step.id]);
        
        // Commit the transaction to release the row lock now that it's marked as RUNNING
        await client.query('COMMIT'); 

        console.log(`[Worker] Dispatched step ${step.id} for intent ${step.intent_id} to MuleSoft.`);

        // 3. Dispatch to MuleSoft (Wrapped in try/catch to prevent Node.js crash)
        try {
            // Using Node's native fetch (available out of the box in Node v22)
            const response = await fetch('http://localhost:8081/api/execute-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    intent_id: step.intent_id,
                    step_id: step.id,
                    target_system: step.target_system,
                    action_name: step.action_name,
                    payload: step.payload
                })
            });

            if (!response.ok) {
                throw new Error(`MuleSoft returned status ${response.status}`);
            }
            
        } catch (dispatchError) {
            console.error(`[Worker] Dispatch failed for step ${step.id}:`, dispatchError.message);
            
            // 4. Trap connection failures safely using the root pool instance
            await pool.query(
                "UPDATE execution_steps SET status = 'FAILED', error_message = $1 WHERE id = $2", 
                [dispatchError.message, step.id]
            );
            await pool.query(
                "UPDATE intents SET status = 'FAILED' WHERE id = $1", 
                [step.intent_id]
            );
            await pool.query(
                "INSERT INTO audit_logs (intent_id, step_id, action_taken, payload_snapshot) VALUES ($1, $2, 'DISPATCH_FAILED', $3)", 
                [step.intent_id, step.id, JSON.stringify({ error: dispatchError.message })]
            );
        }
    } catch (dbError) {
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackErr) {
                console.error("[Worker] Rollback failed:", rollbackErr);
            }
        }
        console.error("Worker DB Error:", dbError);
    } finally {
        if (client) {
            client.release();
        }
    }
}

// Start the continuous engine polling loop every 2 seconds
console.log("[Worker] Nexus Fabric Run-Loop active. Polling database...");
setInterval(processNextStep, 2000);