import { api } from './api';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'SUSPEND' | 'ACTIVATE' | 'EXPORT';
export type AuditTarget = 'SCHOOL' | 'PLAN' | 'USER' | 'PAYMENT' | 'SETTING';

export const logAuditAction = async (
    action: AuditAction,
    targetType: AuditTarget,
    targetId: string | number,
    metadata: any = {}
) => {
    try {
        const user = await api.getMe();
        if (!user) return;

        await api.createAuditLog({
            user_id: user.id,
            action,
            target_type: targetType,
            target_id: String(targetId),
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
                user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server'
            }
        });
    } catch (error) {
        console.error('Audit Log Failed:', error);
    }
};

/**
 * Higher-order utility to wrap long-running operations with audit logging
 */
export const withAuditLog = async <T>(
    action: AuditAction,
    targetType: AuditTarget,
    targetId: string | number,
    operation: () => Promise<T>,
    metadata: any = {}
): Promise<T> => {
    try {
        const result = await operation();
        await logAuditAction(action, targetType, targetId, { ...metadata, status: 'success' });
        return result;
    } catch (error: any) {
        await logAuditAction(action, targetType, targetId, { ...metadata, status: 'failure', error: error.message });
        throw error;
    }
};

