import type { Intent, Step, AuditLog } from './types';

const BASE_URL = 'http://localhost:3002/api';

export const api = {
    async postIntent(prompt: string): Promise<Intent> {
        const res = await fetch(`${BASE_URL}/intents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        return res.json();
    },
    
    async getLatestIntentSteps(): Promise<{ intent: Intent | null, steps: Step[] }> {
        const res = await fetch(`${BASE_URL}/intents/latest/steps`);
        return res.json();
    },

    async approveStep(id: number): Promise<void> {
        await fetch(`${BASE_URL}/steps/${id}/approve`, { method: 'POST' });
    },

    async rejectStep(id: number): Promise<void> {
        await fetch(`${BASE_URL}/steps/${id}/reject`, { method: 'POST' });
    },

    async getAuditLogs(): Promise<AuditLog[]> {
        const res = await fetch(`${BASE_URL}/audit-logs`);
        return res.json();
    }
};