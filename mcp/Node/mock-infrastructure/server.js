const express = require('express');
const crypto = require('crypto'); // Used to generate the unique transaction ID

const app = express();

// Middleware to parse incoming JSON payloads
app.use(express.json());

// ==========================================
// Task 2.2: Mock CRM Endpoint
// ==========================================
app.get('/crm/customers/:id', (req, res) => {
    const customerId = req.params.id;
    
    // Returning a hardcoded simulated JSON payload
    res.json({
        id: customerId,
        name: "Jane Doe",
        email: "jane.doe@example.com",
        lifetime_tier: "Platinum"
    });
});

// ==========================================
// Task 2.3: Mock Billing Endpoint
// ==========================================
app.post('/billing/refunds', (req, res) => {
    const { orderId, amount } = req.body;

    // Simulate a 500ms processing delay using setTimeout
    setTimeout(() => {
        // Generate a random unique transaction ID
        const transactionId = crypto.randomUUID(); 
        
        res.json({
            status: "success",
            transaction_id: transactionId,
            refunded_order: orderId,
            amount: amount
        });
    }, 500);
});

// ==========================================
// Task 2.4: Mock Notification Endpoint
// ==========================================
app.post('/notifications/email', (req, res) => {
    const emailPayload = req.body;

    // Log the incoming email body cleanly to the console
    console.log("\n=== OUTBOUND EMAIL TRIGGERED ===");
    console.log(JSON.stringify(emailPayload, null, 2));
    console.log("================================\n");

    res.json({ message: "Email queued for delivery." });
});

// ==========================================
// Task 2.5: Boot the Server
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Mock infrastructure running on http://localhost:${PORT}`);
});