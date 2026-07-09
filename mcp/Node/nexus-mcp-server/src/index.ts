// src/index.ts
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Pool } from "pg";

// 1. Connect to PostgreSQL using your environment variables
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "postgres",
  password: process.env.DB_PASSWORD || "password",
  port: parseInt(process.env.DB_PORT || "5432"),
});

// 2. Initialize the MCP Server
const server = new Server(
  { name: "nexus-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// 3. Register Tools mapped precisely to your production schema
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "plan_intent",
      description: "Creates an execution plan for a user prompt, breaks it down into sequential steps, and writes to audit logs.",
      inputSchema: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "The user's original request" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                target_name: { type: "string", description: "The target module/system (e.g., aws_s3_module)" },
                payload: { type: "object", description: "The execution payload details" }
              },
              required: ["target_name", "payload"]
            }
          }
        },
        required: ["prompt", "steps"]
      }
    },
    {
      name: "fetch_pending_steps",
      description: "Retrieves all workflow steps currently in 'pending' status, grouped by intent.",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "update_step_status",
      description: "Updates the status of a specific execution step and logs failures if applicable.",
      inputSchema: {
        type: "object",
        properties: {
          step_id: { type: "number" },
          status: { type: "string", enum: ["pending", "in_progress", "completed", "failed"] },
          error_message: { type: "string", description: "Optional error text if the step failed" }
        },
        required: ["step_id", "status"]
      }
    }
  ]
}));

// 4. Implement Tool Handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "plan_intent") {
    const { prompt, steps } = args as any;
    const client = await pool.connect();
    
    try {
      await client.query("BEGIN");
      
      // Insert Intent (Initialize as PLANNING)
      const intentResult = await client.query(
        "INSERT INTO intents (raw_prompt, status) VALUES ($1, 'PLANNING') RETURNING id",
        [prompt]
      );
      const intentId = intentResult.rows[0].id;

      // Insert Execution Steps dynamically maintaining step_order
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await client.query(
          "INSERT INTO execution_steps (intent_id, step_order, target_name, payload, status) VALUES ($1, $2, $3, $4, 'pending')",
          [intentId, i + 1, step.target_name, step.payload]
        );
      }

      // Mark intent as COMPLETED now that plan generation is finalized
      await client.query(
        "UPDATE intents SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [intentId]
      );

      // Log successful generation to audit_logs
      await client.query(
        "INSERT INTO audit_logs (event_type, details) VALUES ($1, $2)",
        ["plan_generation_success", `Successfully mapped intent ID ${intentId} into ${steps.length} ordered execution steps.`]
      );

      await client.query("COMMIT");
      return { content: [{ type: "text", text: `Success! Planned intent ID: ${intentId} with ${steps.length} sequential execution steps.` }] };
    } catch (error: any) {
      await client.query("ROLLBACK");
      
      // Log failure event to audit logs
      await pool.query(
        "INSERT INTO audit_logs (event_type, details) VALUES ($1, $2)",
        ["plan_generation_failure", `Failed to map prompt plan. Error: ${error.message}`]
      );
      return { content: [{ type: "text", text: `Database transaction rolled back. Error: ${error.message}` }], isError: true };
    } finally {
      client.release();
    }
  }

  if (name === "fetch_pending_steps") {
    try {
      const result = await pool.query(`
        SELECT id as step_id, intent_id, step_order, target_name, payload, status 
        FROM execution_steps 
        WHERE status = 'pending' 
        ORDER BY intent_id ASC, step_order ASC
      `);
      return { content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Database error: ${error.message}` }], isError: true };
    }
  }

  if (name === "update_step_status") {
    const { step_id, status, error_message } = args as any;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Update step status and error_message if provided
      await client.query(
        "UPDATE execution_steps SET status = $1, error_message = $2 WHERE id = $3",
        [status, error_message || null, step_id]
      );

      // Write changes directly into your audit logs table
      await client.query(
        "INSERT INTO audit_logs (event_type, details) VALUES ($1, $2)",
        [`step_${status}`, `Execution step ID ${step_id} transitioned to state: ${status}.${error_message ? ' Error: ' + error_message : ''}`]
      );

      await client.query("COMMIT");
      return { content: [{ type: "text", text: `Step ID ${step_id} successfully marked as '${status}'.` }] };
    } catch (error: any) {
      await client.query("ROLLBACK");
      return { content: [{ type: "text", text: `Failed to update status. Database error: ${error.message}` }], isError: true };
    } finally {
      client.release();
    }
  }

  throw new Error("Tool execution routine not found.");
});

// 5. Establish standard input/output transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Nexus MCP Server running natively on stdio mechanisms.");
}

main().catch((error) => {
  console.error("Critical server boundary error:", error);
  process.exit(1);
});