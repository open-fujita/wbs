import React, { useState, useCallback } from 'react';
import type { WBSTask, UpdateTaskInput } from '../types';
import { TaskRow } from './TaskRow';
import './WBSTable.css';

interface WBSTableProps {
    tasks: WBSTask[];
    onUpdate: (id: string, updates: UpdateTaskInput) => void;
    onDelete: (id: string) => void;
    onAddSubTask: (parentId: string) => void;
}

/**
 * WBSメインテーブル
 * 階層構造の折りたたみ対応
 */
export const WBSTable: React.FC<WBSTableProps> = ({ tasks, onUpdate, onDelete, onAddSubTask }) => {
    // 折りたたまれている親タスクIDのSet
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

    // 折りたたみトグル
    const toggleCollapse = useCallback((id: string) => {
        setCollapsedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    // 子タスクを持つかどうか判定
    const hasChildren = useCallback((taskId: string) => {
        return tasks.some(t => t.parentId === taskId);
    }, [tasks]);

    // 折りたたまれた親の子孫かどうか判定
    const isHidden = useCallback((task: WBSTask): boolean => {
        if (!task.parentId) return false;
        if (collapsedIds.has(task.parentId)) return true;
        // 祖先が折りたたまれているか再帰チェック
        const parent = tasks.find(t => t.id === task.parentId);
        return parent ? isHidden(parent) : false;
    }, [tasks, collapsedIds]);

    if (tasks.length === 0) {
        return (
            <div className="wbs-empty">
                <div className="empty-icon">📋</div>
                <p className="empty-text">タスクがありません</p>
                <p className="empty-hint">「タスク追加」ボタンで最初のタスクを追加しましょう</p>
            </div>
        );
    }

    return (
        <div className="wbs-table-container">
            <table className="wbs-table">
                <thead>
                    <tr>
                        <th className="th-actions">操作</th>
                        <th className="th-number">項番</th>
                        <th className="th-category">カテゴリ</th>
                        <th className="th-task">タスク</th>
                        <th className="th-assignee">担当者</th>
                        <th className="th-status">進捗</th>
                        <th className="th-date" colSpan={2}>
                            <div className="th-date-group">
                                <span className="th-date-label">予定</span>
                                <div className="th-date-sub">
                                    <span>開始</span>
                                    <span>終了</span>
                                </div>
                            </div>
                        </th>
                        <th className="th-date" colSpan={2}>
                            <div className="th-date-group">
                                <span className="th-date-label">実績</span>
                                <div className="th-date-sub">
                                    <span>開始</span>
                                    <span>終了</span>
                                </div>
                            </div>
                        </th>
                        <th className="th-notes">備考</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map((task) => (
                        !isHidden(task) && (
                            <TaskRow
                                key={task.id}
                                task={task}
                                onUpdate={onUpdate}
                                onDelete={onDelete}
                                onAddSubTask={onAddSubTask}
                                hasChildren={hasChildren(task.id)}
                                isCollapsed={collapsedIds.has(task.id)}
                                onToggleCollapse={toggleCollapse}
                            />
                        )
                    ))}
                </tbody>
            </table>
        </div>
    );
};

