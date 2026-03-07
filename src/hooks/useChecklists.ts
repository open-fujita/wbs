import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toCamelCase } from '../lib/dbMappers';
import type { Checklist, ChecklistItem, ChecklistTemplate } from '../types';

/**
 * チェックリスト管理用カスタムフック（Supabase版）
 * プロジェクトに依存せず、全チェックリストを管理する
 * parentId による階層構造をサポート
 */
export function useChecklists() {
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [items, setItems] = useState<Record<string, ChecklistItem[]>>({});
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const mapChecklist = (row: Record<string, unknown>) =>
        toCamelCase(row) as unknown as Checklist;
    const mapItem = (row: Record<string, unknown>) =>
        toCamelCase(row) as unknown as ChecklistItem;
    const mapTemplate = (row: Record<string, unknown>) =>
        toCamelCase(row) as unknown as ChecklistTemplate;

    // チェックリスト一覧取得（全件）
    const fetchChecklists = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error: err } = await supabase
                .from('checklists')
                .select('*')
                .order('sort_order', { ascending: true });
            if (err) throw err;

            const mapped = (data || []).map(mapChecklist);
            setChecklists(mapped);

            // 全チェックリストの項目を取得
            if (mapped.length > 0) {
                const ids = mapped.map(c => c.id);
                const { data: itemData, error: itemErr } = await supabase
                    .from('checklist_items')
                    .select('*')
                    .in('checklist_id', ids)
                    .order('sort_order', { ascending: true });
                if (itemErr) throw itemErr;

                const groupedItems: Record<string, ChecklistItem[]> = {};
                (itemData || []).forEach(row => {
                    const item = mapItem(row);
                    if (!groupedItems[item.checklistId]) groupedItems[item.checklistId] = [];
                    groupedItems[item.checklistId].push(item);
                });
                setItems(groupedItems);
            } else {
                setItems({});
            }

            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchChecklists(); }, [fetchChecklists]);

    // テンプレート取得
    const fetchTemplates = useCallback(async () => {
        try {
            const { data, error: err } = await supabase
                .from('checklist_templates')
                .select('*')
                .order('category', { ascending: true });
            if (err) throw err;
            setTemplates((data || []).map(mapTemplate));
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    // チェックリスト作成
    const createChecklist = useCallback(async (
        title: string,
        parentId: string | null = null,
        description?: string
    ) => {
        try {
            const siblings = checklists.filter(c =>
                (!c.parentId && parentId === null) || c.parentId === parentId
            );
            const row: Record<string, unknown> = {
                project_code: '',
                title,
                description: description ?? '',
                sort_order: siblings.length,
                parent_id: parentId,
            };
            const { data, error: err } = await supabase
                .from('checklists')
                .insert(row)
                .select()
                .single();
            if (err) throw err;
            const newChecklist = mapChecklist(data);
            setChecklists(prev => [...prev, newChecklist]);
            return newChecklist;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return null;
        }
    }, [checklists]);

    // チェックリスト更新
    const updateChecklist = useCallback(async (id: string, updates: Partial<Checklist>) => {
        try {
            const row: Record<string, unknown> = {};
            if (updates.title !== undefined) row.title = updates.title;
            if (updates.description !== undefined) row.description = updates.description;
            if (updates.parentId !== undefined) row.parent_id = updates.parentId;
            if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder;
            if (Object.keys(row).length === 0) return;

            const { error: err } = await supabase
                .from('checklists')
                .update(row)
                .eq('id', id);
            if (err) throw err;
            setChecklists(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
        }
    }, []);

    // チェックリスト削除（子も含めて再帰削除）
    const deleteChecklist = useCallback(async (id: string) => {
        try {
            // 子チェックリストのIDを収集
            const collectDescendants = (parentId: string): string[] => {
                const children = checklists.filter(c => c.parentId === parentId);
                return children.flatMap(c => [c.id, ...collectDescendants(c.id)]);
            };
            const allIds = [id, ...collectDescendants(id)];

            // 全て削除（CASCADE で items も削除される）
            for (const delId of allIds) {
                const { error: err } = await supabase
                    .from('checklists')
                    .delete()
                    .eq('id', delId);
                if (err) throw err;
            }

            setChecklists(prev => prev.filter(c => !allIds.includes(c.id)));
            setItems(prev => {
                const next = { ...prev };
                for (const delId of allIds) delete next[delId];
                return next;
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
        }
    }, [checklists]);

    // 項目追加
    const addItem = useCallback(async (checklistId: string, title: string, parentId: string | null = null) => {
        try {
            const currentItems = items[checklistId] || [];
            const siblings = currentItems.filter(i =>
                (!i.parentId && parentId === null) || i.parentId === parentId
            );
            const row: Record<string, unknown> = {
                checklist_id: checklistId,
                title,
                is_completed: false,
                sort_order: siblings.length,
                parent_id: parentId,
            };
            const { data, error: err } = await supabase
                .from('checklist_items')
                .insert(row)
                .select()
                .single();
            if (err) throw err;
            const newItem = mapItem(data);
            setItems(prev => ({
                ...prev,
                [checklistId]: [...(prev[checklistId] || []), newItem],
            }));
            return newItem;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return null;
        }
    }, [items]);

    // 項目更新
    const updateItem = useCallback(async (itemId: string, updates: Partial<ChecklistItem>) => {
        try {
            const row: Record<string, unknown> = {};
            if (updates.title !== undefined) row.title = updates.title;
            if (updates.isCompleted !== undefined) row.is_completed = updates.isCompleted;
            if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder;
            if (Object.keys(row).length === 0) return;

            const { error: err } = await supabase
                .from('checklist_items')
                .update(row)
                .eq('id', itemId);
            if (err) throw err;
            setItems(prev => {
                const next = { ...prev };
                for (const cid of Object.keys(next)) {
                    next[cid] = next[cid].map(item =>
                        item.id === itemId ? { ...item, ...updates } : item
                    );
                }
                return next;
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
        }
    }, []);

    // 項目削除
    const deleteItem = useCallback(async (itemId: string) => {
        try {
            const { error: err } = await supabase
                .from('checklist_items')
                .delete()
                .eq('id', itemId);
            if (err) throw err;
            setItems(prev => {
                const next = { ...prev };
                for (const cid of Object.keys(next)) {
                    next[cid] = next[cid].filter(item => item.id !== itemId);
                }
                return next;
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
        }
    }, []);

    // 項目トグル
    const toggleItem = useCallback(async (itemId: string) => {
        let currentValue = false;
        for (const cid of Object.keys(items)) {
            const item = items[cid].find(i => i.id === itemId);
            if (item) { currentValue = item.isCompleted; break; }
        }
        await updateItem(itemId, { isCompleted: !currentValue });
    }, [items, updateItem]);

    // 項目並び替え
    const reorderItems = useCallback(async (checklistId: string, itemIds: string[]) => {
        try {
            const updates = itemIds.map((id, index) => ({
                id,
                sort_order: index,
            }));
            for (const u of updates) {
                await supabase
                    .from('checklist_items')
                    .update({ sort_order: u.sort_order })
                    .eq('id', u.id);
            }
            setItems(prev => {
                const currentItems = prev[checklistId] || [];
                const sorted = itemIds
                    .map(id => currentItems.find(i => i.id === id))
                    .filter((i): i is ChecklistItem => !!i)
                    .map((item, index) => ({ ...item, sortOrder: index }));
                return { ...prev, [checklistId]: sorted };
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
        }
    }, []);

    // テンプレートからチェックリスト作成
    const createFromTemplate = useCallback(async (
        templateName: string,
        templateItems: { title: string }[],
        parentId: string | null = null
    ) => {
        const checklist = await createChecklist(templateName, parentId);
        if (!checklist) return null;

        try {
            const rows = templateItems.map((item, index) => ({
                checklist_id: checklist.id,
                title: item.title,
                is_completed: false,
                sort_order: index,
            }));
            const { data, error: err } = await supabase
                .from('checklist_items')
                .insert(rows)
                .select();
            if (err) throw err;
            const newItems = (data || []).map(mapItem);
            setItems(prev => ({ ...prev, [checklist.id]: newItems }));
            return checklist;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return null;
        }
    }, [createChecklist]);

    // AI生成結果からチェックリスト作成
    const createFromAI = useCallback(async (
        title: string,
        aiItems: { title: string }[],
        parentId: string | null = null
    ) => {
        return createFromTemplate(title, aiItems, parentId);
    }, [createFromTemplate]);

    // テンプレートとして保存
    const saveAsTemplate = useCallback(async (
        checklistId: string,
        name: string,
        category: string = 'カスタム'
    ) => {
        try {
            const checklistItems = items[checklistId] || [];
            const templateItems = checklistItems.map(i => ({ title: i.title }));

            const { data, error: err } = await supabase
                .from('checklist_templates')
                .insert({
                    name,
                    description: '',
                    category,
                    items: templateItems,
                    is_builtin: false,
                })
                .select()
                .single();
            if (err) throw err;
            const newTemplate = mapTemplate(data);
            setTemplates(prev => [...prev, newTemplate]);
            return newTemplate;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return null;
        }
    }, [items]);

    // テンプレート削除
    const deleteTemplate = useCallback(async (templateId: string) => {
        try {
            const { error: err } = await supabase
                .from('checklist_templates')
                .delete()
                .eq('id', templateId);
            if (err) throw err;
            setTemplates(prev => prev.filter(t => t.id !== templateId));
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
        }
    }, []);

    return {
        checklists, items, templates, loading, error,
        createChecklist, updateChecklist, deleteChecklist,
        addItem, updateItem, deleteItem, toggleItem, reorderItems,
        createFromTemplate, createFromAI, saveAsTemplate, deleteTemplate,
        fetchChecklists,
    };
}
