import React, { useState, useRef, useEffect, forwardRef } from 'react';
import type { WBSTask, TaskStatus, UpdateTaskInput } from '../types';
import { StatusBadge } from './StatusBadge';
import './TaskRow.css';

interface TaskRowProps {
    task: WBSTask;
    onUpdate: (id: string, updates: UpdateTaskInput) => void;
    onDelete: (id: string) => void;
    onAddSubTask: (parentId: string) => void;
    hasChildren: boolean;
    isCollapsed: boolean;
    onToggleCollapse: (id: string) => void;
    /** ドラッグハンドル（DnD用） */
    dragHandle?: React.ReactNode;
    /** tr要素に渡す追加props（style等、refはforwardRefで渡す） */
    trProps?: Omit<React.HTMLAttributes<HTMLTableRowElement>, 'ref'>;
}

/**
 * WBSテーブルの各行コンポーネント
 * インライン編集・折りたたみ対応
 */
export const TaskRow = forwardRef<HTMLTableRowElement, TaskRowProps>(({
    task, onUpdate, onDelete, onAddSubTask,
    hasChildren, isCollapsed, onToggleCollapse,
    dragHandle, trProps,
}, ref) => {
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // 編集開始時にフォーカスを当てる
    useEffect(() => {
        if (editingField && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingField]);

    // セルクリックで編集モードに入る
    const startEdit = (field: string, value: string) => {
        setEditingField(field);
        setEditValue(value);
    };

    // 編集確定
    const commitEdit = () => {
        if (editingField) {
            const updates: UpdateTaskInput = { [editingField]: editValue };
            onUpdate(task.id, updates);
            setEditingField(null);
        }
    };

    // キー操作（Enter確定、Escキャンセル）
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            commitEdit();
        } else if (e.key === 'Escape') {
            setEditingField(null);
        }
    };

    // 編集可能セルをレンダリング
    const renderEditableCell = (field: string, value: string, className?: string) => {
        if (editingField === field) {
            return (
                <input
                    ref={inputRef}
                    className="cell-input"
                    type={field.includes('Start') || field.includes('End') ? 'date' : 'text'}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={handleKeyDown}
                />
            );
        }
        return (
            <span
                className={`cell-text ${className || ''}`}
                onClick={() => startEdit(field, value)}
                title="クリックで編集"
            >
                {value || '\u00A0'}
            </span>
        );
    };

    // 日付セルのレンダリング（日付はonChangeで即座に保存）
    const renderDateCell = (field: string, value: string) => {
        if (editingField === field) {
            return (
                <input
                    ref={inputRef}
                    className="cell-input cell-input-date"
                    type="date"
                    value={editValue}
                    onChange={(e) => {
                        const newValue = e.target.value;
                        setEditValue(newValue);
                        // 日付選択時は即座に保存
                        onUpdate(task.id, { [field]: newValue });
                    }}
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') {
                            setEditingField(null);
                        }
                    }}
                />
            );
        }
        return (
            <span
                className="cell-text cell-date"
                onClick={() => startEdit(field, value)}
                title="クリックで編集"
            >
                {value ? formatDate(value) : '\u00A0'}
            </span>
        );
    };

    return (
        <tr
            ref={ref}
            className={`task-row depth-${task.depth} status-${task.status}`}
            {...trProps}
        >
            {/* 操作ボタン (左端へ移動) */}
            <td className="cell-actions">
                {dragHandle}
                <button
                    className="btn-action btn-add-sub"
                    onClick={() => onAddSubTask(task.id)}
                    title="サブタスク追加"
                >
                    +
                </button>
                <button
                    className="btn-action btn-delete"
                    onClick={() => onDelete(task.id)}
                    title="削除"
                >
                    ×
                </button>
            </td>

            {/* 項番 */}
            <td className="cell-number">{task.itemNumber}</td>

            {/* カテゴリ */}
            <td className="cell-category">
                {renderEditableCell('category', task.category)}
            </td>

            {/* タスク名（階層インデント + 折りたたみボタン付き） */}
            <td className="cell-task">
                <div className="task-name-wrapper" style={{ paddingLeft: `${task.depth * 20}px` }}>
                    {hasChildren ? (
                        <button
                            className="collapse-toggle"
                            onClick={() => onToggleCollapse(task.id)}
                            title={isCollapsed ? '展開' : '折りたたみ'}
                        >
                            {isCollapsed ? '▶' : '▼'}
                        </button>
                    ) : (
                        task.depth > 0 && <span className="indent-marker">└</span>
                    )}
                    {renderEditableCell('taskName', task.taskName, 'task-name')}
                </div>
            </td>

            {/* 担当者 */}
            <td className="cell-assignee">
                {renderEditableCell('assignee', task.assignee)}
            </td>

            {/* 進捗 */}
            <td className="cell-status">
                <StatusBadge
                    status={task.status}
                    onChange={(status: TaskStatus) => onUpdate(task.id, { status })}
                />
            </td>

            {/* 予定開始 */}
            <td className="cell-date">{renderDateCell('plannedStart', task.plannedStart)}</td>

            {/* 予定終了 */}
            <td className="cell-date">{renderDateCell('plannedEnd', task.plannedEnd)}</td>

            {/* 実績開始 */}
            <td className="cell-date">{renderDateCell('actualStart', task.actualStart)}</td>

            {/* 実績終了 */}
            <td className="cell-date">{renderDateCell('actualEnd', task.actualEnd)}</td>

            {/* 備考 */}
            <td className="cell-notes">
                {renderEditableCell('notes', task.notes)}
            </td>
        </tr>
    );
});

TaskRow.displayName = 'TaskRow';

// 日付フォーマット（YYYY-MM-DD → M/D表示）
function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}
