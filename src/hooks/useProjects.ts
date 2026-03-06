import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toCamelCase } from '../lib/dbMappers';
import { WBS_TEMPLATES, getPhaseWeights } from '../lib/wbsTemplates';
import type { Project } from '../types';

function getErrorMessage(err: unknown): string {
    let msg = '不明なエラー';
    if (err instanceof Error) msg = err.message;
    else if (err && typeof err === 'object' && 'message' in err) {
        msg = String((err as { message: string }).message);
    } else {
        msg = String(err);
    }
    if (msg.includes('Failed to fetch') || msg.includes('fetch')) {
        return 'Supabaseに接続できません。.envのVITE_SUPABASE_URLとVITE_SUPABASE_ANON_KEYを確認し、Supabaseプロジェクトが有効か確認してください。';
    }
    return msg;
}

/**
 * プロジェクトデータ管理用カスタムフック（Supabase版）
 */
export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const mapProject = (row: Record<string, unknown>) =>
        toCamelCase(row) as unknown as Project;

    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error: err } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });
            if (err) throw err;
            setProjects((data || []).map(mapProject));
            setError(null);
        } catch (err) {
            const msg = getErrorMessage(err);
            setError(msg);
            console.error('プロジェクト取得エラー:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    const createProject = useCallback(async (input: Partial<Project>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('ログインが必要です');

            const { data: existing } = await supabase
                .from('projects')
                .select('project_code')
                .eq('user_id', user.id);
            const maxNum = (existing || []).reduce((max, p) => {
                const m = String(p?.project_code || '').match(/PRJ-(\d+)/);
                return m ? Math.max(max, parseInt(m[1], 10)) : max;
            }, 0);
            const projectCode = `PRJ-${String(maxNum + 1).padStart(3, '0')}`;

            const row = {
                project_code: projectCode,
                user_id: user.id,
                name: input.name ?? '',
                category: input.category ?? '',
                purpose: input.purpose ?? '',
                planned_start: input.plannedStart ?? '',
                planned_end: input.plannedEnd ?? '',
                parent_id: input.parentId && input.parentId !== '' ? input.parentId : null,
            };

            const { data, error: err } = await supabase
                .from('projects')
                .insert(row)
                .select()
                .single();
            if (err) throw err;
            const newProject = mapProject(data);
            setProjects(prev => [newProject, ...prev]);
            return newProject;
        } catch (err) {
            const msg = getErrorMessage(err);
            setError(msg);
            console.error('プロジェクト作成エラー:', err);
            return null;
        }
    }, []);

    const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
        try {
            const row: Record<string, unknown> = {};
            const map: Record<string, string> = {
                name: 'name', category: 'category', purpose: 'purpose',
                plannedStart: 'planned_start', plannedEnd: 'planned_end',
                parentId: 'parent_id', wikiContent: 'wiki_content', wikiFormat: 'wiki_format',
                mandalaData: 'mandala_data',
            };
            for (const [key, value] of Object.entries(updates)) {
                if (map[key] && value !== undefined) {
                    row[map[key]] = value === '' && key === 'parentId' ? null : value;
                }
            }
            if (Object.keys(row).length === 0) return null;

            const { data, error: err } = await supabase
                .from('projects')
                .update(row)
                .eq('id', id)
                .select()
                .single();
            if (err) throw err;
            const updated = mapProject(data);
            setProjects(prev => prev.map(p => p.id === id ? updated : p));
            return updated;
        } catch (err) {
            setError(getErrorMessage(err));
            return null;
        }
    }, []);

    const deleteProject = useCallback(async (id: string) => {
        try {
            const { data: project } = await supabase
                .from('projects')
                .select('project_code')
                .eq('id', id)
                .single();

            if (project?.project_code) {
                await supabase
                    .from('projects')
                    .update({ parent_id: null })
                    .eq('parent_id', id);
                await supabase
                    .from('wbs_tasks')
                    .delete()
                    .eq('project_code', project.project_code);
                await supabase
                    .from('issues')
                    .update({ project_code: '' })
                    .eq('project_code', project.project_code);
            }

            const { error: err } = await supabase
                .from('projects')
                .delete()
                .eq('id', id);
            if (err) throw err;
            setProjects(prev => prev.filter(p => p.id !== id));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : '不明なエラー');
            return false;
        }
    }, []);

    const generateWBS = useCallback(async (projectId: string) => {
        try {
            const { data: project, error: projErr } = await supabase
                .from('projects')
                .select('project_code, name, category, purpose, planned_start, planned_end')
                .eq('id', projectId)
                .single();
            if (projErr || !project) throw new Error('プロジェクトが見つかりません');

            const templateKey = project.category && WBS_TEMPLATES[project.category]
                ? project.category : 'その他';
            const template = WBS_TEMPLATES[templateKey];

            const start = project.planned_start ? new Date(project.planned_start) : new Date();
            const end = project.planned_end
                ? new Date(project.planned_end)
                : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
            const totalDays = Math.max(
                (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
                template.length
            );

            const phaseWeights = getPhaseWeights(templateKey, template.length);
            const totalWeight = phaseWeights.reduce((a, b) => a + b, 0);

            await supabase
                .from('wbs_tasks')
                .delete()
                .eq('project_code', project.project_code);

            let itemNumber = 1;
            let sortOrder = 1;
            let currentStart = start;
            const tasksToInsert: Record<string, unknown>[] = [];

            for (let phaseIdx = 0; phaseIdx < template.length; phaseIdx++) {
                const phase = template[phaseIdx];
                const phaseDays = Math.max(Math.floor(totalDays * phaseWeights[phaseIdx] / totalWeight), 1);
                const phaseEnd = new Date(currentStart.getTime() + phaseDays * 24 * 60 * 60 * 1000);
                const phaseStartStr = currentStart.toISOString().split('T')[0];
                const phaseEndStr = phaseEnd.toISOString().split('T')[0];

                const parentId = crypto.randomUUID();
                tasksToInsert.push({
                    id: parentId,
                    item_number: itemNumber++,
                    category: phase.category,
                    task_name: phase.category,
                    parent_id: null,
                    depth: 0,
                    assignee: '',
                    status: '未着手',
                    planned_start: phaseStartStr,
                    planned_end: phaseEndStr,
                    actual_start: '',
                    actual_end: '',
                    notes: '',
                    sort_order: sortOrder++,
                    project_code: project.project_code,
                });

                const subDays = Math.max(Math.floor(phaseDays / phase.tasks.length), 1);
                let subStart = currentStart;
                for (const taskName of phase.tasks) {
                    const subEnd = new Date(subStart.getTime() + subDays * 24 * 60 * 60 * 1000);
                    tasksToInsert.push({
                        id: crypto.randomUUID(),
                        item_number: itemNumber++,
                        category: phase.category,
                        task_name: taskName,
                        parent_id: parentId,
                        depth: 1,
                        assignee: '',
                        status: '未着手',
                        planned_start: subStart.toISOString().split('T')[0],
                        planned_end: subEnd.toISOString().split('T')[0],
                        actual_start: '',
                        actual_end: '',
                        notes: '',
                        sort_order: sortOrder++,
                        project_code: project.project_code,
                    });
                    subStart = subEnd;
                }
                currentStart = phaseEnd;
            }

            const { error: insertErr } = await supabase
                .from('wbs_tasks')
                .insert(tasksToInsert);
            if (insertErr) throw insertErr;

            return {
                message: `${tasksToInsert.length}件のタスクを生成しました（${templateKey}テンプレート）`,
                taskCount: tasksToInsert.length,
                projectCode: project.project_code,
                templateUsed: templateKey,
            };
        } catch (err) {
            setError(getErrorMessage(err));
            return null;
        }
    }, []);

    return { projects, loading, error, createProject, updateProject, deleteProject, generateWBS, fetchProjects };
}
