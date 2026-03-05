import React from 'react';
import type { TaskStatus } from '../types';
import { TASK_STATUSES, STATUS_COLORS } from '../types';
import './StatusBadge.css';

interface StatusBadgeProps {
    status: TaskStatus;
    onChange: (status: TaskStatus) => void;
}

/**
 * 進捗ステータスバッジ
 * ステータスごとに色分け表示し、ドロップダウンで切り替え可能
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, onChange }) => {
    const colors = STATUS_COLORS[status];

    return (
        <select
            className="status-badge"
            value={status}
            onChange={(e) => onChange(e.target.value as TaskStatus)}
            style={{
                backgroundColor: colors.bg,
                color: colors.text,
                borderColor: colors.border,
            }}
        >
            {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                    {s}
                </option>
            ))}
        </select>
    );
};
