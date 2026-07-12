const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`Here you need to look at ${req.method} ${req.url}`);
    next();
});

const db = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'nexus_fabric',
    password: 'root', // <-- Remember to set this!
    port: 5432,
});

// --- DAY 12: Intents & Steps ---

app.post('/api/intents', async (req, res) => {
    const { prompt } = req.body;
    try {
        // Insert matching your DB constraint (PLANNING) and alias for the UI
        const result = await db.query(
            "INSERT INTO intents (raw_prompt, status) VALUES ($1, 'PLANNING') RETURNING id, raw_prompt AS prompt, status, created_at",
            [prompt]
        );
        const intent = result.rows[0];
        
        // Insert mock steps using YOUR columns (target_name, lowercase statuses)
        await db.query(
            `INSERT INTO execution_steps (intent_id, step_order, target_name, status, payload) VALUES 
            ($1, 1, 'aws_s3_module', 'completed', '{"bucket_name": "new-bucket"}'),
            ($1, 2, 'iam_policy_module', 'pending', '{"role": "admin"}'),
            ($1, 3, 'data_analyzer', 'pending', '{"dataset": "q3_financials"}')`,
            [intent.id]
        );

        res.json(intent);
    } catch (err) {
        console.error("❌ DB Error on POST /intents:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/intents/latest/steps', async (req, res) => {
    try {
        // Fetch Intent, map raw_prompt to prompt
        const intentRes = await db.query("SELECT id, raw_prompt AS prompt, status, created_at FROM intents ORDER BY created_at DESC LIMIT 1");
        if (intentRes.rows.length === 0) return res.json({ intent: null, steps: [] });
        
        const intent = intentRes.rows[0];
        // Translate DB status to UI status
        if (intent.status === 'PLANNING') intent.status = 'RUNNING';

        // Fetch Steps, alias target_name to both target_system and action_name so the UI works without changes
        const stepsRes = await db.query(
            `SELECT id, intent_id, step_order, 
                    target_name AS target_system, 
                    target_name AS action_name, 
                    status, payload, error_message 
             FROM execution_steps 
             WHERE intent_id = $1 ORDER BY step_order ASC`, 
            [intent.id]
        );
        
        // Translate DB constraints ('in_progress') to UI states ('RUNNING')
        const mappedSteps = stepsRes.rows.map(step => {
            let mappedStatus = step.status.toUpperCase();
            if (mappedStatus === 'IN_PROGRESS') mappedStatus = 'RUNNING';
            
            // To demonstrate the Day 14 Safety Gate without violating DB constraints, 
            // we will pretend a 'pending' step 2 is 'AWAITING_APPROVAL' on the UI.
            if (mappedStatus === 'PENDING' && step.step_order === 2) {
                mappedStatus = 'AWAITING_APPROVAL';
            }
            return { ...step, status: mappedStatus };
        });
        
        res.json({ intent, steps: mappedSteps });
    } catch (err) {
        console.error("❌ DB Error on GET /latest/steps:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- DAY 12: Webhook Controller ---

app.post('/api/webhook/step-complete', async (req, res) => {
    const { step_id, intent_id, status, error_message, payload_snapshot } = req.body;
    try {
        // The webhook sends 'COMPLETED' (UI standard), we must lower-case it for your DB constraint
        const dbStatus = status.toLowerCase(); 
        
        await db.query(
            "UPDATE execution_steps SET status = $1, error_message = $2 WHERE id = $3", 
            [dbStatus, error_message || null, step_id]
        );
        
        // Using your audit_logs schema: event_type, details
        await db.query(
            "INSERT INTO audit_logs (event_type, details) VALUES ($1, $2)",
            [`ASYNC_CALLBACK: ${status}`, JSON.stringify(payload_snapshot)]
        );
        
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("❌ Webhook Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- DAY 14: Safety Gate Approvals ---

app.post('/api/steps/:id/approve', async (req, res) => {
    try {
        // Map UI approval to 'in_progress' to satisfy DB CHECK constraint
        await db.query("UPDATE execution_steps SET status = 'in_progress' WHERE id = $1", [req.params.id]);
        
        await db.query(
            "INSERT INTO audit_logs (event_type, details) VALUES ($1, $2)",
            ['authorization_success', 'Human explicitly authorized the step execution.']
        );
        res.json({ success: true });
    } catch (err) {
        console.error("❌ Approval Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/steps/:id/reject', async (req, res) => {
    try {
        await db.query("UPDATE execution_steps SET status = 'failed', error_message = 'Rejected by manual override.' WHERE id = $1", [req.params.id]);
        await db.query(
            "INSERT INTO audit_logs (event_type, details) VALUES ($1, $2)",
            ['manual_override', 'Human operator manually rejected the step.']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DAY 15: Audit Logs ---

app.get('/api/audit-logs', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, 
                    event_type AS action_taken, 
                    event_timestamp AS timestamp, 
                    details AS payload_snapshot 
             FROM audit_logs ORDER BY event_timestamp DESC LIMIT 50`
        );
        
        // Safely check if it's JSON before parsing, otherwise wrap the text in an object
        const logs = result.rows.map(log => {
            let parsedPayload;
            try {
                parsedPayload = JSON.parse(log.payload_snapshot);
            } catch (e) {
                // If it's plain text (like your manual inserts), wrap it in an object so the UI <pre> tag renders it safely
                parsedPayload = { message: log.payload_snapshot };
            }

            return { ...log, payload_snapshot: parsedPayload };
        });
        
        res.json(logs);
    } catch (err) {
        console.error("❌ DB Error on GET /audit-logs:", err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3002;
app.listen(PORT, () => console.log(`Nexus Orchestrator running on port ${PORT}`));