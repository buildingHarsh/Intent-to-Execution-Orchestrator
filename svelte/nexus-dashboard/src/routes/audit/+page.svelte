<script lang="ts">
    import { onMount } from 'svelte';
    import { api } from '$lib/api';
    import type { AuditLog } from '$lib/types';

    // Make the logs array reactive
    let logs: AuditLog[] = $state([]);

    onMount(async () => {
        logs = await api.getAuditLogs();
    });
</script>

<div class="audit-container">
    <div class="audit-header">
        <h2>System Audit Trail</h2>
        <p>Immutable record of orchestration executions.</p>
    </div>

    <div class="log-timeline">
        {#each logs as log}
            <div class="log-entry">
                <div class="timestamp-col">
                    <span class="time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span class="date">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
                
                <div class="log-content">
                    <div class="log-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                        <strong>{log.action_taken}</strong>
                    </div>
                    
                    <details class="payload-inspector">
                        <summary>Inspect Payload Snapshot</summary>
                        <div class="code-editor-theme">
                            <pre><code>{JSON.stringify(log.payload_snapshot, null, 2)}</code></pre>
                        </div>
                    </details>
                </div>
            </div>
        {/each}
        {#if logs.length === 0}
            <div class="empty-state">No audit logs available.</div>
        {/if}
    </div>
</div>

<style>
    .audit-container {
        max-width: 900px;
        margin: 0 auto;
    }

    .audit-header {
        margin-bottom: 32px;
    }
    .audit-header h2 { margin: 0 0 8px 0; }
    .audit-header p { margin: 0; color: #666; }

    .log-timeline {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .log-entry {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 24px;
        background: white;
        padding: 20px;
        border-radius: 8px;
        border: 1px solid var(--border-color);
        box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .timestamp-col {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        border-right: 2px solid var(--border-color);
        padding-right: 24px;
        color: #666;
    }

    .timestamp-col .time {
        font-weight: 600;
        color: #333;
    }

    .timestamp-col .date {
        font-size: 0.8rem;
    }

    .log-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .log-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: monospace;
        font-size: 1.1rem;
        color: var(--primary);
    }

    .payload-inspector summary {
        font-size: 0.9rem;
        cursor: pointer;
        color: #555;
        padding: 4px 0;
        user-select: none;
    }

    /* Dark-themed code editor look */
    .code-editor-theme {
        background: #282c34;
        border-radius: 6px;
        margin-top: 8px;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
    }

    .code-editor-theme pre {
        margin: 0;
        padding: 16px;
        overflow-x: auto;
    }

    .code-editor-theme code {
        font-family: 'Fira Code', 'Courier New', Courier, monospace;
        font-size: 0.85rem;
        color: #abb2bf;
        line-height: 1.5;
    }

    .empty-state {
        text-align: center;
        padding: 48px;
        color: #888;
        background: white;
        border-radius: 8px;
        border: 1px dashed var(--border-color);
    }
</style>