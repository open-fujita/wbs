import { useState, useEffect, useCallback } from 'react';
import type { Project } from '../types';

const API_BASE = '/api';

/**
 * プロジェクトデータ管理用カスタムフック
 */
export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 全プロジェクト取得
    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/projects`);
            if (!res.ok) throw new Error('プロジェクトの取得に失敗しました');
            const data = await res.json();
            setProjects(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    // プロジェクト作成
    const createProject = useCallback(async (input: Partial<Project>) => {
        try {
            const res = await fetch(`${API_BASE}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });
            if (!res.ok) throw new Error('プロジェクトの作成に失敗しました');
            const newProject = await res.json();
            setProjects(prev => [newProject, ...prev]);
            return newProject as Project;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return null;
        }
    }, []);

    // プロジェクト更新
    const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
        try {
            const res = await fetch(`${API_BASE}/projects/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error('プロジェクトの更新に失敗しました');
            const updated = await res.json();
            setProjects(prev => prev.map(p => p.id === id ? updated : p));
            return updated as Project;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return null;
        }
    }, []);

    // プロジェクト削除
    const deleteProject = useCallback(async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('プロジェクトの削除に失敗しました');
            setProjects(prev => prev.filter(p => p.id !== id));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return false;
        }
    }, []);

    // WBS自動生成
    const generateWBS = useCallback(async (projectId: string) => {
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}/generate-wbs`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('WBSの自動生成に失敗しました');
            return await res.json();
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return null;
        }
    }, []);

    return { projects, loading, error, createProject, updateProject, deleteProject, generateWBS, fetchProjects };
}
