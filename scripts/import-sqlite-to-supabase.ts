/**
 * SQLite (wbs.db) のデータを Supabase にインポートするスクリプト
 * 実行: npm run import:sqlite
 */
import 'dotenv/config';
import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'wbs.db');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('エラー: .env に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function toNull(val: unknown): unknown {
    if (val === '' || val === null || val === undefined) return null;
    return val;
}

async function main() {
    const db = new Database(DB_PATH, { readonly: true });

    try {
        // projects (wiki_content, wiki_format はマイグレーションで追加された列)
        let projects: Record<string, unknown>[];
        try {
            projects = db.prepare(`
                SELECT id, project_code, name, category, purpose,
                       planned_start, planned_end, parent_id, wiki_content, wiki_format,
                       created_at, updated_at
                FROM projects
            `).all() as Record<string, unknown>[];
        } catch {
            projects = db.prepare(`
                SELECT id, project_code, name, category, purpose,
                       planned_start, planned_end, parent_id,
                       created_at, updated_at
                FROM projects
            `).all() as Record<string, unknown>[];
            projects = projects.map(p => ({ ...p, wiki_content: '', wiki_format: 'text' }));
        }

        if (projects.length > 0) {
            const rows = projects.map(p => ({
                id: p.id,
                project_code: p.project_code,
                name: p.name ?? '',
                category: p.category ?? '',
                purpose: p.purpose ?? '',
                planned_start: p.planned_start ?? '',
                planned_end: p.planned_end ?? '',
                parent_id: toNull(p.parent_id),
                wiki_content: p.wiki_content ?? '',
                wiki_format: p.wiki_format ?? 'text',
                created_at: p.created_at ?? null,
                updated_at: p.updated_at ?? null,
            }));
            const { error } = await supabase.from('projects').upsert(rows, { onConflict: 'id' });
            if (error) throw error;
            console.log(`projects: ${rows.length} 件インポート`);
        }

        // wbs_tasks
        const tasks = db.prepare(`
            SELECT id, item_number, category, task_name, parent_id, depth,
                   assignee, status, planned_start, planned_end,
                   actual_start, actual_end, notes, sort_order, project_code,
                   created_at, updated_at
            FROM wbs_tasks
        `).all() as Record<string, unknown>[];

        if (tasks.length > 0) {
            const rows = tasks.map(t => ({
                id: t.id,
                item_number: t.item_number,
                category: t.category ?? '',
                task_name: t.task_name ?? '',
                parent_id: toNull(t.parent_id),
                depth: t.depth ?? 0,
                assignee: t.assignee ?? '',
                status: t.status ?? '未着手',
                planned_start: t.planned_start ?? '',
                planned_end: t.planned_end ?? '',
                actual_start: t.actual_start ?? '',
                actual_end: t.actual_end ?? '',
                notes: t.notes ?? '',
                sort_order: t.sort_order ?? 0,
                project_code: t.project_code ?? '',
                created_at: t.created_at ?? null,
                updated_at: t.updated_at ?? null,
            }));
            const { error } = await supabase.from('wbs_tasks').upsert(rows, { onConflict: 'id' });
            if (error) throw error;
            console.log(`wbs_tasks: ${rows.length} 件インポート`);
        }

        // issues
        const issues = db.prepare(`
            SELECT id, project_code, title, description, priority, status,
                   assignee, due_date, created_at, updated_at
            FROM issues
        `).all() as Record<string, unknown>[];

        if (issues.length > 0) {
            const rows = issues.map(i => ({
                id: i.id,
                project_code: i.project_code ?? '',
                title: i.title ?? '',
                description: i.description ?? '',
                priority: i.priority ?? '中',
                status: i.status ?? '未対応',
                assignee: i.assignee ?? '',
                due_date: i.due_date ?? '',
                created_at: i.created_at ?? null,
                updated_at: i.updated_at ?? null,
            }));
            const { error } = await supabase.from('issues').upsert(rows, { onConflict: 'id' });
            if (error) throw error;
            console.log(`issues: ${rows.length} 件インポート`);
        }

        // issue_comments
        const comments = db.prepare(`
            SELECT id, issue_id, content, user_name, created_at
            FROM issue_comments
        `).all() as Record<string, unknown>[];

        if (comments.length > 0) {
            const rows = comments.map(c => ({
                id: c.id,
                issue_id: c.issue_id,
                content: c.content ?? '',
                user_name: c.user_name ?? 'ユーザー',
                created_at: c.created_at ?? null,
            }));
            const { error } = await supabase.from('issue_comments').upsert(rows, { onConflict: 'id' });
            if (error) throw error;
            console.log(`issue_comments: ${rows.length} 件インポート`);
        }

        console.log('インポート完了');
    } catch (err) {
        console.error('インポートエラー:', err);
        process.exit(1);
    } finally {
        db.close();
    }
}

main();
