import { useState, useEffect, useCallback } from 'react';
import type { WBSTask, CreateTaskInput, UpdateTaskInput } from '../types';

const API_BASE = '/api';

/**
 * WBSデータ管理用カスタムフック
 * projectCodeで絞り込んだタスクを管理する
 */
export function useWBSData(projectCode?: string) {
    const [tasks, setTasks] = useState<WBSTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // タスク取得（projectCodeでフィルター）
    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const url = projectCode
                ? `${API_BASE}/tasks?projectCode=${encodeURIComponent(projectCode)}`
                : `${API_BASE}/tasks`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('タスクの取得に失敗しました');
            const data = await res.json();
            setTasks(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
        } finally {
            setLoading(false);
        }
    }, [projectCode]);

    // projectCode変更時に再取得
    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // タスク追加（projectCodeを自動付与）
    const addTask = useCallback(async (input: CreateTaskInput) => {
        try {
            const body = { ...input, projectCode: projectCode || '' };
            const res = await fetch(`${API_BASE}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('タスクの追加に失敗しました');
            const newTask = await res.json();
            setTasks(prev => [...prev, newTask]);
            return newTask;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return null;
        }
    }, [projectCode]);

    // タスク更新
    const updateTask = useCallback(async (id: string, updates: UpdateTaskInput) => {
        try {
            const res = await fetch(`${API_BASE}/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error('タスクの更新に失敗しました');
            const updated = await res.json();
            setTasks(prev => prev.map(t => t.id === id ? updated : t));
            return updated;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return null;
        }
    }, []);

    // タスク削除
    const deleteTask = useCallback(async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('タスクの削除に失敗しました');
            setTasks(prev => prev.filter(t => t.id !== id));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return false;
        }
    }, []);

    // サブタスク追加
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

    // 階層構造を考慮したタスクリスト
    const getHierarchicalTasks = useCallback((): WBSTask[] => {
        const rootTasks = tasks.filter(t => !t.parentId);
        const result: WBSTask[] = [];

        const addChildren = (parentId: string) => {
            const children = tasks.filter(t => t.parentId === parentId);
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
        fetchTasks,
    };
}

