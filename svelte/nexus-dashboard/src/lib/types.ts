export interface Intent {
    id: number;
    prompt: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    created_at: string;
}

export interface Step {
    id: number;
    intent_id: number;
    step_order: number;
    target_system: string;
    action_name: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'AWAITING_APPROVAL';
    payload: Record<string, any>;
    error_message?: string;
}

export interface AuditLog {
    id: number;
    timestamp: string;
    action_taken: string;
    payload_snapshot: Record<string, any>;
}