import { useState, useEffect, useCallback } from 'react';
import type { Issue, IssueComment } from '../types';

const API_BASE = '/api';

/**
 * 課題データ管理用カスタムフック
 */
export function useIssues(projectCode?: string) {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 課題取得
    const fetchIssues = useCallback(async () => {
        try {
            setLoading(true);
            const url = projectCode
                ? `${API_BASE}/issues?projectCode=${encodeURIComponent(projectCode)}`
                : `${API_BASE}/issues`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('課題の取得に失敗しました');
            const data = await res.json();
            setIssues(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
        } finally {
            setLoading(false);
        }
    }, [projectCode]);

    useEffect(() => { fetchIssues(); }, [fetchIssues]);

    // 課題作成
    const createIssue = useCallback(async (input: Partial<Issue>) => {
        try {
            const body = { ...input, projectCode: projectCode || '' };
            const res = await fetch(`${API_BASE}/issues`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('課題の作成に失敗しました');
            const newIssue = await res.json();
            setIssues(prev => [newIssue, ...prev]);
            return newIssue as Issue;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return null;
        }
    }, [projectCode]);

    // 課題更新
    const updateIssue = useCallback(async (id: string, updates: Partial<Issue>) => {
        try {
            const res = await fetch(`${API_BASE}/issues/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error('課題の更新に失敗しました');
            const updated = await res.json();
            setIssues(prev => prev.map(i => i.id === id ? updated : i));
            return updated as Issue;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return null;
        }
    }, []);

    // 課題削除
    const deleteIssue = useCallback(async (id: string) => {
        try {
            const res = await fetch(`${API_BASE}/issues/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('課題の削除に失敗しました');
            setIssues(prev => prev.filter(i => i.id !== id));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return false;
        }
    }, []);

    // コメント取得
    const fetchComments = useCallback(async (issueId: string) => {
        try {
            const res = await fetch(`${API_BASE}/issues/${issueId}/comments`);
            if (!res.ok) throw new Error('コメントの取得に失敗しました');
            return await res.json() as IssueComment[];
        } catch (err) {
            console.error(err);
            return [];
        }
    }, []);

    // コメント追加
    const addComment = useCallback(async (issueId: string, content: string, userName?: string) => {
        try {
            const res = await fetch(`${API_BASE}/issues/${issueId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, userName }),
            });
            if (!res.ok) throw new Error('コメントの追加に失敗しました');
            return await res.json() as IssueComment;
        } catch (err) {
            console.error(err);
            return null;
        }
    }, []);

    return {
        issues, loading, error,
        createIssue, updateIssue, deleteIssue, fetchIssues,
        fetchComments, addComment
    };
}
