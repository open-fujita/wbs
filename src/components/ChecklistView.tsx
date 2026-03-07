import React, { useState, useCallback } from 'react';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Checklist, ChecklistItem, ChecklistTemplate } from '../types';
import { ChecklistTemplateModal } from './ChecklistTemplateModal';
import { ChecklistAIModal } from './ChecklistAIModal';
import './ChecklistView.css';

interface ChecklistViewProps {
    checklist: Checklist;
    items: ChecklistItem[];
    templates: ChecklistTemplate[];
    allChecklists: Checklist[];
    onUpdateChecklist: (id: string, updates: Partial<Checklist>) => Promise<void>;
    onDeleteChecklist: (id: string) => Promise<void>;
    onAddItem: (checklistId: string, title: string, parentId?: string | null) => Promise<ChecklistItem | null>;
    onUpdateItem: (itemId: string, updates: Partial<ChecklistItem>) => Promise<void>;
    onDeleteItem: (itemId: string) => Promise<void>;
    onToggleItem: (itemId: string) => Promise<void>;
    onReorderItems: (checklistId: string, itemIds: string[]) => Promise<void>;
    onCreateFromTemplate: (name: string, items: { title: string }[], parentId?: string | null) => Promise<Checklist | null>;
    onCreateFromAI: (title: string, items: { title: string }[], parentId?: string | null) => Promise<Checklist | null>;
    onSaveAsTemplate: (checklistId: string, name: string, category?: string) => Promise<ChecklistTemplate | null>;
    onDeleteTemplate: (templateId: string) => Promise<void>;
}

// ソータブル項目コンポーネント
const SortableItem: React.FC<{
    item: ChecklistItem;
    depth: number;
    hasChildren: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    onUpdate: (title: string) => void;
    onDelete: () => void;
    onAddChild: () => void;
    onToggleExpand: () => void;
}> = ({ item, depth, hasChildren, isExpanded, onToggle, onUpdate, onDelete, onAddChild, onToggleExpand }) => {
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(item.title);

    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleSave = () => {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== item.title) {
            onUpdate(trimmed);
        }
        setEditing(false);
    };

    return (
        <div ref={setNodeRef} style={style} className={`checklist-item ${item.isCompleted ? 'completed' : ''}`}>
            <div className="checklist-item-indent" style={{ width: `${depth * 20}px`, flexShrink: 0 }} />
            <div className="checklist-item-toggle">
                {hasChildren ? (
                    <button className="checklist-tree-toggle-btn" onClick={onToggleExpand}>
                        {isExpanded ? '▼' : '▶'}
                    </button>
                ) : (
                    <span className="checklist-tree-toggle-placeholder" />
                )}
            </div>
            <button className="drag-handle" {...attributes} {...listeners} tabIndex={-1}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                </svg>
            </button>
            <label className="checklist-checkbox">
                <input type="checkbox" checked={item.isCompleted} onChange={onToggle} />
                <span className="checkmark" />
            </label>
            {editing ? (
                <input
                    className="checklist-item-edit"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
                    autoFocus
                />
            ) : (
                <span
                    className="checklist-item-title"
                    onClick={() => { setEditValue(item.title); setEditing(true); }}
                >
                    {item.title}
                </span>
            )}
            <button className="checklist-item-add-child" onClick={onAddChild} title="子タスクを追加">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>
            <button className="checklist-item-delete" onClick={onDelete} title="削除">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>
    );
};

export const ChecklistView: React.FC<ChecklistViewProps> = ({
    checklist, items, templates, allChecklists,
    onUpdateChecklist, onDeleteChecklist,
    onAddItem, onUpdateItem, onDeleteItem, onToggleItem, onReorderItems,
    onCreateFromTemplate, onCreateFromAI,
    onSaveAsTemplate, onDeleteTemplate,
}) => {
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [addingItemParentId, setAddingItemParentId] = useState<string | null | undefined>(undefined);
    const [newItemTitle, setNewItemTitle] = useState('');
    const [editingTitle, setEditingTitle] = useState(false);
    const [editTitleValue, setEditTitleValue] = useState('');
    const [saveTemplateId, setSaveTemplateId] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [editingParent, setEditingParent] = useState(false);
    const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const completedCount = items.filter(i => i.isCompleted).length;
    const totalCount = items.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // 自分自身と自分の子孫を除外した親候補一覧
    const collectDescendantIds = (id: string): string[] => {
        const children = allChecklists.filter(c => c.parentId === id);
        return children.flatMap(c => [c.id, ...collectDescendantIds(c.id)]);
    };
    const excludeIds = new Set([checklist.id, ...collectDescendantIds(checklist.id)]);
    const parentCandidates = allChecklists.filter(c => !excludeIds.has(c.id));
    const parentChecklist = allChecklists.find(c => c.id === checklist.parentId);

    const toggleItemExpand = (id: string) => {
        setExpandedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleAddItem = async () => {
        if (!newItemTitle.trim()) return;
        const parentId = addingItemParentId ?? null;
        await onAddItem(checklist.id, newItemTitle.trim(), parentId);
        // 親の展開状態を開く
        if (parentId) {
            setExpandedItemIds(prev => new Set(prev).add(parentId));
        }
        // 子タスク追加時はフォームを閉じる、ルート追加時は連続入力
        if (parentId) {
            cancelAddingItem();
        } else {
            setNewItemTitle('');
        }
    };

    const startAddingItem = (parentId: string | null) => {
        setAddingItemParentId(parentId);
        setNewItemTitle('');
    };

    const cancelAddingItem = () => {
        setAddingItemParentId(undefined);
        setNewItemTitle('');
    };

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const newIds = items.map(i => i.id);
        newIds.splice(oldIndex, 1);
        newIds.splice(newIndex, 0, String(active.id));
        onReorderItems(checklist.id, newIds);
    }, [items, onReorderItems, checklist.id]);

    const handleSaveTitle = async () => {
        const trimmed = editTitleValue.trim();
        if (trimmed && trimmed !== checklist.title) {
            await onUpdateChecklist(checklist.id, { title: trimmed });
        }
        setEditingTitle(false);
    };

    const handleChangeParent = async (newParentId: string) => {
        await onUpdateChecklist(checklist.id, { parentId: newParentId || null });
        setEditingParent(false);
    };

    const handleDeleteChecklist = () => {
        if (window.confirm(`「${checklist.title || '無題'}」を削除しますか？`)) {
            onDeleteChecklist(checklist.id);
        }
    };

    const handleSaveAsTemplate = async () => {
        if (!saveTemplateId || !templateName.trim()) return;
        await onSaveAsTemplate(saveTemplateId, templateName.trim());
        setSaveTemplateId(null);
        setTemplateName('');
    };

    const handleTemplateSelect = async (name: string, templateItems: { title: string }[]) => {
        await onCreateFromTemplate(name, templateItems, checklist.parentId);
        setShowTemplateModal(false);
    };

    const handleAICreate = async (title: string, aiItems: { title: string }[]) => {
        await onCreateFromAI(title, aiItems, checklist.parentId);
        setShowAIModal(false);
    };

    // ツリー表示用：再帰的にアイテムをフラット化（表示順）
    const buildFlatTree = (parentId: string | null, depth: number): { item: ChecklistItem; depth: number }[] => {
        const children = items.filter(i =>
            (!i.parentId && parentId === null) || i.parentId === parentId
        );
        const result: { item: ChecklistItem; depth: number }[] = [];
        for (const child of children) {
            result.push({ item: child, depth });
            const hasChildren = items.some(i => i.parentId === child.id);
            if (hasChildren && expandedItemIds.has(child.id)) {
                result.push(...buildFlatTree(child.id, depth + 1));
            }
        }
        return result;
    };

    const flatItems = buildFlatTree(null, 0);
    const allItemIds = flatItems.map(f => f.item.id);

    return (
        <div className="checklist-view">
            {/* ヘッダー */}
            <div className="checklist-header">
                <div className="checklist-header-left">
                    {/* 親チェックリスト */}
                    {editingParent ? (
                        <div className="checklist-parent-edit-row">
                            <select
                                className="checklist-parent-select"
                                value={checklist.parentId || ''}
                                onChange={e => handleChangeParent(e.target.value)}
                                onBlur={() => setEditingParent(false)}
                                autoFocus
                            >
                                <option value="">ルート（親なし）</option>
                                {parentCandidates.map(c => (
                                    <option key={c.id} value={c.id}>{c.title || '無題'}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <button
                            className="checklist-folder-badge"
                            onClick={() => setEditingParent(true)}
                            title="親チェックリストを変更"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
                            </svg>
                            {parentChecklist ? parentChecklist.title : 'ルート'}
                        </button>
                    )}

                    {/* タイトル */}
                    {editingTitle ? (
                        <input
                            className="checklist-detail-title-edit"
                            value={editTitleValue}
                            onChange={e => setEditTitleValue(e.target.value)}
                            onBlur={handleSaveTitle}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                            autoFocus
                        />
                    ) : (
                        <h2
                            className="checklist-title clickable"
                            onClick={() => { setEditTitleValue(checklist.title); setEditingTitle(true); }}
                        >
                            {checklist.title || '無題のチェックリスト'}
                        </h2>
                    )}

                    {/* 進捗 */}
                    {totalCount > 0 && (
                        <div className="checklist-progress-header">
                            <div className="progress-bar wide">
                                <div className="progress-fill" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="progress-text">{completedCount}/{totalCount} 完了</span>
                        </div>
                    )}
                </div>

                <div className="checklist-header-actions">
                    <button
                        className="checklist-action-btn"
                        onClick={() => setShowTemplateModal(true)}
                        title="テンプレートから作成"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                        </svg>
                    </button>
                    <button
                        className="checklist-action-btn"
                        onClick={() => setShowAIModal(true)}
                        title="AIで自動生成"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3h-1v4a4 4 0 0 1-8 0v-4H7a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z" />
                            <circle cx="9" cy="10" r="1" />
                            <circle cx="15" cy="10" r="1" />
                        </svg>
                    </button>
                    <button
                        className="checklist-action-btn"
                        onClick={() => { setSaveTemplateId(checklist.id); setTemplateName(checklist.title); }}
                        title="テンプレートとして保存"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                        </svg>
                    </button>
                    <button
                        className="checklist-action-btn danger"
                        onClick={handleDeleteChecklist}
                        title="削除"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* チェックリスト項目 */}
            <div className="checklist-detail-body">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={allItemIds} strategy={verticalListSortingStrategy}>
                        {flatItems.map(({ item, depth }) => {
                            const hasChildren = items.some(i => i.parentId === item.id);
                            const isAddingChild = addingItemParentId === item.id;
                            return (
                                <React.Fragment key={item.id}>
                                    <SortableItem
                                        item={item}
                                        depth={depth}
                                        hasChildren={hasChildren}
                                        isExpanded={expandedItemIds.has(item.id)}
                                        onToggle={() => onToggleItem(item.id)}
                                        onUpdate={(title) => onUpdateItem(item.id, { title })}
                                        onDelete={() => onDeleteItem(item.id)}
                                        onAddChild={() => startAddingItem(item.id)}
                                        onToggleExpand={() => toggleItemExpand(item.id)}
                                    />
                                    {isAddingChild && (
                                        <div className="checklist-add-item-form" style={{ paddingLeft: `${(depth + 1) * 20 + 4}px` }}>
                                            <input
                                                className="checklist-add-item-input"
                                                placeholder="子タスク..."
                                                value={newItemTitle}
                                                onChange={e => setNewItemTitle(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleAddItem();
                                                    if (e.key === 'Escape') cancelAddingItem();
                                                }}
                                                autoFocus
                                            />
                                            <button className="btn-small" onClick={handleAddItem}>追加</button>
                                            <button className="btn-small-secondary" onClick={cancelAddingItem}>×</button>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </SortableContext>
                </DndContext>

                {items.length === 0 && addingItemParentId === undefined && (
                    <div className="checklist-empty-items">
                        <p>項目がありません。追加してください。</p>
                    </div>
                )}

                {/* ルート項目追加 */}
                {addingItemParentId === null ? (
                    <div className="checklist-add-item-form">
                        <input
                            className="checklist-add-item-input"
                            placeholder="新しい項目..."
                            value={newItemTitle}
                            onChange={e => setNewItemTitle(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleAddItem();
                                if (e.key === 'Escape') cancelAddingItem();
                            }}
                            autoFocus
                        />
                        <button className="btn-small" onClick={handleAddItem}>追加</button>
                        <button className="btn-small-secondary" onClick={cancelAddingItem}>×</button>
                    </div>
                ) : addingItemParentId === undefined ? (
                    <button
                        className="checklist-add-item-btn"
                        onClick={() => startAddingItem(null)}
                    >
                        + 項目を追加
                    </button>
                ) : null}
            </div>

            {/* テンプレート保存ダイアログ */}
            {saveTemplateId && (
                <div className="modal-overlay" onClick={() => setSaveTemplateId(null)}>
                    <div className="modal-content small" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">テンプレートとして保存</h3>
                        <input
                            className="modal-input"
                            placeholder="テンプレート名"
                            value={templateName}
                            onChange={e => setTemplateName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveAsTemplate(); }}
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button className="btn-primary" onClick={handleSaveAsTemplate}>保存</button>
                            <button className="btn-secondary" onClick={() => setSaveTemplateId(null)}>キャンセル</button>
                        </div>
                    </div>
                </div>
            )}

            {showTemplateModal && (
                <ChecklistTemplateModal
                    templates={templates}
                    onSelect={handleTemplateSelect}
                    onDeleteTemplate={onDeleteTemplate}
                    onClose={() => setShowTemplateModal(false)}
                />
            )}

            {showAIModal && (
                <ChecklistAIModal
                    onClose={() => setShowAIModal(false)}
                    onCreate={handleAICreate}
                />
            )}
        </div>
    );
};
