import React, { useState, useCallback, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { WBSTask, UpdateTaskInput } from '../types';
import { TaskRow } from './TaskRow';
import './WBSTable.css';

const COLUMN_KEYS = ['actions', 'number', 'category', 'task', 'assignee', 'status', 'plannedStart', 'plannedEnd', 'actualStart', 'actualEnd', 'notes'] as const;
const DEFAULT_WIDTHS: Record<string, number> = {
    actions: 70, number: 56, category: 90, task: 200, assignee: 80, status: 90,
    plannedStart: 90, plannedEnd: 90, actualStart: 90, actualEnd: 90, notes: 120,
};
const COL_MIN = 40;
const COL_MAX = 400;

interface WBSTableProps {
    tasks: WBSTask[];
    onUpdate: (id: string, updates: UpdateTaskInput) => void;
    onDelete: (id: string) => void;
    onAddSubTask: (parentId: string) => void;
    onReorder: (draggedId: string, overId: string) => Promise<boolean>;
}

/**
 * WBSメインテーブル
 * 階層構造の折りたたみ対応、カラム幅リサイズ対応
 */
/** ソート可能なタスク行（useSortableでラップ） */
const SortableTaskRow: React.FC<{
    task: WBSTask;
    onUpdate: (id: string, updates: UpdateTaskInput) => void;
    onDelete: (id: string) => void;
    onAddSubTask: (parentId: string) => void;
    hasChildren: (id: string) => boolean;
    isCollapsed: (id: string) => boolean;
    onToggleCollapse: (id: string) => void;
}> = ({ task, onUpdate, onDelete, onAddSubTask, hasChildren, isCollapsed, onToggleCollapse }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <TaskRow
            ref={setNodeRef}
            task={task}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onAddSubTask={onAddSubTask}
            hasChildren={hasChildren(task.id)}
            isCollapsed={isCollapsed(task.id)}
            onToggleCollapse={onToggleCollapse}
            dragHandle={
                <span
                    className="drag-handle"
                    {...attributes}
                    {...listeners}
                    title="ドラッグで順序変更"
                >
                    ::
                </span>
            }
            trProps={{ style }}
        />
    );
};

export const WBSTable: React.FC<WBSTableProps> = ({ tasks, onUpdate, onDelete, onAddSubTask, onReorder }) => {
    // 折りたたまれている親タスクIDのSet
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

    // カラム幅（リサイズ可能）
    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        try {
            const saved = localStorage.getItem('wbs-column-widths');
            if (saved) {
                const parsed = JSON.parse(saved) as Record<string, number>;
                const valid: Record<string, number> = {};
                for (const k of COLUMN_KEYS) {
                    const v = parsed[k];
                    if (typeof v === 'number' && v >= COL_MIN && v <= COL_MAX) {
                        valid[k] = v;
                    } else {
                        valid[k] = DEFAULT_WIDTHS[k] ?? 90;
                    }
                }
                return valid;
            }
        } catch { /* ignore */ }
        return { ...DEFAULT_WIDTHS };
    });

    useEffect(() => {
        localStorage.setItem('wbs-column-widths', JSON.stringify(colWidths));
    }, [colWidths]);

    const handleResizeStart = useCallback((colKey: string, e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startW = colWidths[colKey] ?? DEFAULT_WIDTHS[colKey];

        const onMouseMove = (ev: MouseEvent) => {
            const delta = ev.clientX - startX;
            const next = Math.min(COL_MAX, Math.max(COL_MIN, startW + delta));
            setColWidths(prev => ({ ...prev, [colKey]: next }));
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [colWidths]);

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

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        await onReorder(String(active.id), String(over.id));
    }, [onReorder]);

    const ResizeHandle = ({ colKey }: { colKey: string }) => (
        <span
            className="wbs-col-resize-handle"
            onMouseDown={(e) => handleResizeStart(colKey, e)}
            aria-label={`${colKey}の幅を変更`}
        />
    );

    return (
        <div className="wbs-table-container">
            <table className="wbs-table" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                    {COLUMN_KEYS.map(k => (
                        <col key={k} style={{ width: colWidths[k] ?? DEFAULT_WIDTHS[k] }} />
                    ))}
                </colgroup>
                <thead>
                    <tr>
                        <th rowSpan={2} className="th-actions">
                            <span>操作</span>
                            <ResizeHandle colKey="actions" />
                        </th>
                        <th rowSpan={2} className="th-number">
                            <span>項番</span>
                            <ResizeHandle colKey="number" />
                        </th>
                        <th rowSpan={2} className="th-category">
                            <span>カテゴリ</span>
                            <ResizeHandle colKey="category" />
                        </th>
                        <th rowSpan={2} className="th-task">
                            <span>タスク</span>
                            <ResizeHandle colKey="task" />
                        </th>
                        <th rowSpan={2} className="th-assignee">
                            <span>担当者</span>
                            <ResizeHandle colKey="assignee" />
                        </th>
                        <th rowSpan={2} className="th-status">
                            <span>進捗</span>
                            <ResizeHandle colKey="status" />
                        </th>
                        <th colSpan={2} className="th-date-group-header">予定</th>
                        <th colSpan={2} className="th-date-group-header">実績</th>
                        <th rowSpan={2} className="th-notes">
                            <span>備考</span>
                            <ResizeHandle colKey="notes" />
                        </th>
                    </tr>
                    <tr>
                        <th className="th-date">
                            <span>開始</span>
                            <ResizeHandle colKey="plannedStart" />
                        </th>
                        <th className="th-date">
                            <span>終了</span>
                            <ResizeHandle colKey="plannedEnd" />
                        </th>
                        <th className="th-date">
                            <span>開始</span>
                            <ResizeHandle colKey="actualStart" />
                        </th>
                        <th className="th-date">
                            <span>終了</span>
                            <ResizeHandle colKey="actualEnd" />
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={tasks.filter(t => !isHidden(t)).map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {tasks.map((task) => (
                                !isHidden(task) && (
                                    <SortableTaskRow
                                        key={task.id}
                                        task={task}
                                        onUpdate={onUpdate}
                                        onDelete={onDelete}
                                        onAddSubTask={onAddSubTask}
                                        hasChildren={hasChildren}
                                        isCollapsed={(id) => collapsedIds.has(id)}
                                        onToggleCollapse={toggleCollapse}
                                    />
                                )
                            ))}
                        </SortableContext>
                    </DndContext>
                </tbody>
            </table>
        </div>
    );
};

