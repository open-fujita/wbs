import { useState, useEffect, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase } from '../lib/supabase';
import { toCamelCase } from '../lib/dbMappers';
import type { WBSTask, CreateTaskInput, UpdateTaskInput } from '../types';

/**
 * WBSデータ管理用カスタムフック（Supabase版）
 */
export function useWBSData(projectCode?: string) {
    const [tasks, setTasks] = useState<WBSTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const mapTask = (row: Record<string, unknown>) =>
        toCamelCase(row) as unknown as WBSTask;

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('wbs_tasks')
                .select('*')
                .order('sort_order', { ascending: true })
                .order('item_number', { ascending: true });
            if (projectCode) {
                query = query.eq('project_code', projectCode);
            }
            const { data, error: err } = await query;
            if (err) throw err;
            setTasks((data || []).map(mapTask));
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
        } finally {
            setLoading(false);
        }
    }, [projectCode]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const addTask = useCallback(async (input: CreateTaskInput) => {
        try {
            const { data: maxData } = await supabase
                .from('wbs_tasks')
                .select('item_number')
                .eq('project_code', projectCode || '')
                .order('item_number', { ascending: false })
                .limit(1)
                .single();
            const itemNumber = (maxData?.item_number ?? 0) + 1;
            const sortOrder = input.sortOrder ?? itemNumber;

            const row = {
                item_number: itemNumber,
                category: input.category ?? '',
                task_name: input.taskName ?? '',
                parent_id: input.parentId || null,
                depth: input.depth ?? 0,
                assignee: input.assignee ?? '',
                status: input.status ?? '未着手',
                planned_start: input.plannedStart ?? '',
                planned_end: input.plannedEnd ?? '',
                actual_start: input.actualStart ?? '',
                actual_end: input.actualEnd ?? '',
                notes: input.notes ?? '',
                sort_order: sortOrder,
                project_code: input.projectCode ?? projectCode ?? '',
            };

            const { data, error: err } = await supabase
                .from('wbs_tasks')
                .insert(row)
                .select()
                .single();
            if (err) throw err;
            const newTask = mapTask(data);
            setTasks(prev => [...prev, newTask]);
            return newTask;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return null;
        }
    }, [projectCode]);

    const updateTask = useCallback(async (id: string, updates: UpdateTaskInput) => {
        try {
            const map: Record<string, string> = {
                category: 'category', taskName: 'task_name', parentId: 'parent_id',
                depth: 'depth', assignee: 'assignee', status: 'status',
                plannedStart: 'planned_start', plannedEnd: 'planned_end',
                actualStart: 'actual_start', actualEnd: 'actual_end',
                notes: 'notes', sortOrder: 'sort_order', itemNumber: 'item_number',
                projectCode: 'project_code',
            };
            const row: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(updates)) {
                if (map[key] && value !== undefined) {
                    row[map[key]] = value;
                }
            }
            if (Object.keys(row).length === 0) return null;

            const { data, error: err } = await supabase
                .from('wbs_tasks')
                .update(row)
                .eq('id', id)
                .select()
                .single();
            if (err) throw err;
            const updated = mapTask(data);
            setTasks(prev => prev.map(t => t.id === id ? updated : t));
            return updated;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return null;
        }
    }, []);

    const deleteTask = useCallback(async (id: string) => {
        try {
            await supabase
                .from('wbs_tasks')
                .update({ parent_id: null, depth: 0 })
                .eq('parent_id', id);
            const { error: err } = await supabase
                .from('wbs_tasks')
                .delete()
                .eq('id', id);
            if (err) throw err;
            setTasks(prev => prev.filter(t => t.id !== id));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return false;
        }
    }, []);

    const addSubTask = useCallback(async (parentId: string) => {
        const parent = tasks.find(t => t.id === parentId);
        if (!parent) return null;
        return addTask({
            category: parent.category,
            taskName: '',
            parentId,
            depth: parent.depth + 1,
            assignee: '',
            status: '未着手',
            plannedStart: '',
            plannedEnd: '',
            actualStart: '',
            actualEnd: '',
            notes: '',
            projectCode: parent.projectCode || '',
        });
    }, [tasks, addTask]);

    const reorderTasks = useCallback(async (draggedId: string, overId: string): Promise<boolean> => {
        if (draggedId === overId) return true;
        const dragged = tasks.find(t => t.id === draggedId);
        const over = tasks.find(t => t.id === overId);
        if (!dragged || !over) return false;
        if (dragged.parentId !== over.parentId) return false;

        const siblings = tasks
            .filter(t => t.parentId === dragged.parentId)
            .sort((a, b) => a.sortOrder - b.sortOrder);
        const oldIndex = siblings.findIndex(t => t.id === draggedId);
        const newIndex = siblings.findIndex(t => t.id === overId);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return true;

        const reordered = arrayMove(siblings, oldIndex, newIndex);
        try {
            for (let i = 0; i < reordered.length; i++) {
                const task = reordered[i];
                if (task.sortOrder !== i) {
                    const { error: err } = await supabase
                        .from('wbs_tasks')
                        .update({ sort_order: i })
                        .eq('id', task.id);
                    if (err) throw err;
                }
            }
            setTasks(prev => {
                const byId = new Map(prev.map(t => [t.id, t]));
                reordered.forEach((t, i) => {
                    const existing = byId.get(t.id);
                    if (existing) byId.set(t.id, { ...existing, sortOrder: i });
                });
                return prev.map(t => byId.get(t.id) ?? t);
            });
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return false;
        }
    }, [tasks]);

    const getHierarchicalTasks = useCallback((): WBSTask[] => {
        const rootTasks = tasks.filter(t => !t.parentId);
        const result: WBSTask[] = [];
        const addChildren = (pid: string) => {
            const children = tasks.filter(t => t.parentId === pid);
            children.sort((a, b) => a.sortOrder - b.sortOrder);
            for (const child of children) {
                result.push(child);
                addChildren(child.id);
            }
        };
        rootTasks.sort((a, b) => a.sortOrder - b.sortOrder);
        for (const root of rootTasks) {
            result.push(root);
            addChildren(root.id);
        }
        return result;
    }, [tasks]);

    return {
        tasks,
        hierarchicalTasks: getHierarchicalTasks(),
        loading,
        error,
        addTask,
        updateTask,
        deleteTask,
        addSubTask,
        reorderTasks,
        fetchTasks,
    };
}
