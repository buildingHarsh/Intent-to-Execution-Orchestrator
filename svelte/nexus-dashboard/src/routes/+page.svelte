<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { api } from '$lib/api';
    import type { Intent, Step } from '$lib/types';

    // Svelte 5 Runes: Variables must use $state() to trigger UI updates
    let prompt = $state('');
    let isSubmitting = $state(false);
    let intent: Intent | null = $state(null);
    let steps: Step[] = $state([]);
    let pollInterval: ReturnType<typeof setInterval>;

    const loadData = async () => {
        const data = await api.getLatestIntentSteps();
        console.log("📦 Data from Node:", data);
        intent = data.intent;
        steps = data.steps;
    };

    onMount(() => {
        loadData();
        pollInterval = setInterval(loadData, 2000); 
    });

    onDestroy(() => {
        if (pollInterval) clearInterval(pollInterval);
    });

    const submitIntent = async () => {
        if (!prompt.trim()) return;
        isSubmitting = true;
        await api.postIntent(prompt);
        prompt = ''; // This will now correctly clear the text area
        await loadData();
        isSubmitting = false;
    };

    const handleApprove = async (id: number) => {
        await api.approveStep(id);
        await loadData();
    };

    const handleReject = async (id: number) => {
        await api.rejectStep(id);
        await loadData();
    };
</script>

<div class="dashboard">
    <!-- Intake Form -->
    <div class="intake-card">
        <h3>New Business Intent</h3>
        <div class="form-group">
            <textarea 
                bind:value={prompt} 
                placeholder="e.g., Refund order 999 and notify the customer..."
                rows="3"
            ></textarea>
            <button class="btn-primary" on:click={submitIntent} disabled={isSubmitting}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                Generate Plan
            </button>
        </div>
    </div>

    <!-- Workflow Visualization -->
    {#if intent}
        <div class="workflow-header">
            <h3>Active Workflow Execution</h3>
            <span class="intent-badge status-{intent.status.toLowerCase()}">
                {intent.status}
            </span>
        </div>
        
        <div class="timeline">
            {#each steps as step}
                <div class="step-card status-{step.status.toLowerCase()}">
                    <div class="step-icon">
                        {#if step.status === 'COMPLETED'} 
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        {:else if step.status === 'RUNNING'} 
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                        {:else if step.status === 'FAILED'} 
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        {:else if step.status === 'AWAITING_APPROVAL'} 
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        {:else} 
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        {/if}
                    </div>
                    
                    <div class="step-content">
                        <div class="step-meta">
                            <span class="system-badge">{step.target_system}</span>
                            <span class="step-order">Step {step.step_order}</span>
                        </div>
                        <h4 class="action-name">{step.action_name}</h4>
                        
                        {#if step.error_message}
                            <p class="error-msg">{step.error_message}</p>
                        {/if}

                        <details class="payload-details">
                            <summary>View Payload</summary>
                            <pre>{JSON.stringify(step.payload, null, 2)}</pre>
                        </details>

                        <!-- Human in the loop Gate -->
                        {#if step.status === 'AWAITING_APPROVAL'}
                            <div class="approval-actions">
                                <p>Human approval required to proceed.</p>
                                <div class="action-buttons">
                                    <button class="btn-approve" on:click={() => handleApprove(step.id)}>Approve</button>
                                    <button class="btn-reject" on:click={() => handleReject(step.id)}>Reject</button>
                                </div>
                            </div>
                        {/if}
                    </div>
                    
                    <div class="step-status-label">
                        {step.status.replace('_', ' ')}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .dashboard {
        max-width: 900px;
        margin: 0 auto;
    }

    /* Intake Form */
    .intake-card {
        background: white;
        border-radius: 8px;
        padding: 24px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        border: 1px solid var(--border-color);
        margin-bottom: 32px;
    }

    .intake-card h3 {
        margin-top: 0;
        margin-bottom: 16px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 16px;
        align-items: flex-end;
    }

    textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        font-family: inherit;
        font-size: 1rem;
        resize: vertical;
        box-sizing: border-box;
    }

    textarea:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
    }

    .btn-primary {
        background: var(--primary);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background 0.2s;
    }

    .btn-primary:hover { background: #357abd; }
    .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

    /* Workflow Header */
    .workflow-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
    }

    .workflow-header h3 { margin: 0; }
    .intent-badge {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
    }

    /* Timeline & Cards */
    .timeline {
        display: flex;
        flex-direction: column;
        gap: 16px;
        position: relative;
    }

    /* Timeline connecting line */
    .timeline::before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        left: 24px;
        width: 2px;
        background: var(--border-color);
        z-index: 0;
    }

    .step-card {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: 48px 1fr auto;
        background: white;
        border-radius: 8px;
        padding: 20px;
        border: 2px solid transparent;
        box-shadow: 0 2px 4px rgba(0,0,0,0.04);
        transition: all 0.3s ease;
    }

    .step-icon {
        display: flex;
        justify-content: center;
        margin-top: 4px;
    }

    .step-meta {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 8px;
    }

    .system-badge {
        font-size: 0.75rem;
        background: #e1e4e8;
        color: #24292e;
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 600;
        letter-spacing: 0.5px;
    }

    .step-order {
        font-size: 0.8rem;
        color: #6a737d;
    }

    .action-name {
        margin: 0 0 12px 0;
        font-size: 1.1rem;
    }

    .error-msg {
        font-size: 0.85rem;
        margin-bottom: 12px;
    }

    .payload-details summary {
        font-size: 0.85rem;
        cursor: pointer;
        color: var(--primary);
        user-select: none;
    }

    .payload-details pre {
        background: #1e1e24;
        color: #a0a0b0;
        padding: 12px;
        border-radius: 4px;
        font-size: 0.8rem;
        overflow-x: auto;
        margin-top: 8px;
    }

    .step-status-label {
        font-size: 0.8rem;
        font-weight: bold;
        text-transform: uppercase;
        align-self: flex-start;
    }

    /* State-Based Styling (The critical requirement) */
    .status-pending {
        background: var(--c-pending-bg);
        border-color: var(--c-pending-border);
        color: var(--c-pending-text);
    }
    .status-pending .step-icon { color: var(--c-pending-text); }

    .status-completed {
        background: var(--c-completed-bg);
        border-color: var(--c-completed-border);
    }
    .status-completed .step-icon, .status-completed .step-status-label {
        color: var(--c-completed-text);
    }

    .status-failed {
        background: var(--c-failed-bg);
        border-color: var(--c-failed-border);
    }
    .status-failed .step-icon, .status-failed .step-status-label, .status-failed .error-msg {
        color: var(--c-failed-text);
    }

    .status-awaiting_approval {
        background: var(--c-awaiting-bg);
        border-color: var(--c-awaiting-border);
        border-width: 3px;
    }
    .status-awaiting_approval .step-icon, .status-awaiting_approval .step-status-label {
        color: var(--c-awaiting-border);
    }

    /* Running State + Animation */
    @keyframes pulse-border {
        0% { box-shadow: 0 0 0 0 rgba(246, 195, 67, 0.4); border-color: rgba(246, 195, 67, 0.4); }
        50% { box-shadow: 0 0 0 8px rgba(246, 195, 67, 0); border-color: rgba(246, 195, 67, 1); }
        100% { box-shadow: 0 0 0 0 rgba(246, 195, 67, 0); border-color: rgba(246, 195, 67, 0.4); }
    }

    .status-running {
        background: var(--c-running-bg);
        border-color: var(--c-running-border);
        animation: pulse-border 2s infinite;
    }
    .status-running .step-icon, .status-running .step-status-label {
        color: var(--c-running-text);
    }

    /* Approval Gate Actions */
    .approval-actions {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px dashed var(--c-awaiting-border);
    }

    .approval-actions p {
        margin-top: 0;
        font-size: 0.9rem;
        color: #333;
        font-weight: 500;
    }

    .action-buttons {
        display: flex;
        gap: 12px;
    }

    .btn-approve, .btn-reject {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.1s, opacity 0.2s;
    }

    .btn-approve {
        background: var(--c-completed-border);
        color: white;
    }
    .btn-approve:hover { background: #2ea043; transform: translateY(-1px); }

    .btn-reject {
        background: var(--c-failed-border);
        color: white;
    }
    .btn-reject:hover { background: #b32d3a; transform: translateY(-1px); }
</style>