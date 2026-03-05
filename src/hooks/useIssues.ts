import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toCamelCase } from '../lib/dbMappers';
import type { Issue, IssueComment } from '../types';

/**
 * 課題データ管理用カスタムフック（Supabase版）
 */
export function useIssues(projectCode?: string) {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const mapIssue = (row: Record<string, unknown>) =>
        toCamelCase(row) as unknown as Issue;
    const mapComment = (row: Record<string, unknown>) =>
        toCamelCase(row) as unknown as IssueComment;

    const fetchIssues = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('issues')
                .select('*')
                .order('created_at', { ascending: false });
            if (projectCode) {
                query = query.eq('project_code', projectCode);
            }
            const { data, error: err } = await query;
            if (err) throw err;
            setIssues((data || []).map(mapIssue));
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
        } finally {
            setLoading(false);
        }
    }, [projectCode]);

    useEffect(() => { fetchIssues(); }, [fetchIssues]);

    const createIssue = useCallback(async (input: Partial<Issue>) => {
        try {
            const row = {
                project_code: input.projectCode ?? projectCode ?? '',
                title: input.title ?? '',
                description: input.description ?? '',
                priority: input.priority ?? '中',
                status: input.status ?? '未対応',
                assignee: input.assignee ?? '',
                due_date: input.dueDate ?? '',
            };
            const { data, error: err } = await supabase
                .from('issues')
                .insert(row)
                .select()
                .single();
            if (err) throw err;
            const newIssue = mapIssue(data);
            setIssues(prev => [newIssue, ...prev]);
            return newIssue;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return null;
        }
    }, [projectCode]);

    const updateIssue = useCallback(async (id: string, updates: Partial<Issue>) => {
        try {
            const map: Record<string, string> = {
                title: 'title', description: 'description',
                priority: 'priority', status: 'status',
                assignee: 'assignee', dueDate: 'due_date',
            };
            const row: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(updates)) {
                if (map[key] && value !== undefined) row[map[key]] = value;
            }
            if (Object.keys(row).length === 0) return null;

            const { data, error: err } = await supabase
                .from('issues')
                .update(row)
                .eq('id', id)
                .select()
                .single();
            if (err) throw err;
            const updated = mapIssue(data);
            setIssues(prev => prev.map(i => i.id === id ? updated : i));
            return updated;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return null;
        }
    }, []);

    const deleteIssue = useCallback(async (id: string) => {
        try {
            const { error: err } = await supabase
                .from('issues')
                .delete()
                .eq('id', id);
            if (err) throw err;
            setIssues(prev => prev.filter(i => i.id !== id));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return false;
        }
    }, []);

    const fetchComments = useCallback(async (issueId: string) => {
        try {
            const { data, error: err } = await supabase
                .from('issue_comments')
                .select('*')
                .eq('issue_id', issueId)
                .order('created_at', { ascending: true });
            if (err) throw err;
            return (data || []).map(mapComment);
        } catch (err) {
            console.error(err);
            return [];
        }
    }, []);

    const addComment = useCallback(async (issueId: string, content: string, userName?: string) => {
        try {
            const row = {
                issue_id: issueId,
                content: content.trim(),
                user_name: userName ?? 'ユーザー',
            };
            const { data, error: err } = await supabase
                .from('issue_comments')
                .insert(row)
                .select()
                .single();
            if (err) throw err;
            return mapComment(data);
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
