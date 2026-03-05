import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { randomUUID } from 'crypto';

const router = Router();

/**
 * タスク取得（projectCodeでフィルター可能）
 * GET /api/tasks?projectCode=PRJ-001
 */
router.get('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const { projectCode } = req.query;

        let sql = `
      SELECT 
        id, item_number as itemNumber, category, task_name as taskName,
        parent_id as parentId, depth, assignee,
        status, planned_start as plannedStart, planned_end as plannedEnd,
        actual_start as actualStart, actual_end as actualEnd,
        notes, sort_order as sortOrder, project_code as projectCode,
        created_at as createdAt, updated_at as updatedAt
      FROM wbs_tasks`;
        const params: unknown[] = [];

        if (projectCode) {
            sql += ' WHERE project_code = ?';
            params.push(projectCode);
        }
        sql += ' ORDER BY sort_order ASC, item_number ASC';

        const tasks = db.prepare(sql).all(...params);
        res.json(tasks);
    } catch (error) {
        console.error('タスク取得エラー:', error);
        res.status(500).json({ error: 'タスクの取得に失敗しました' });
    }
});

/**
 * タスク追加
 * POST /api/tasks
 */
router.post('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const {
            category = '',
            taskName = '',
            parentId = null,
            depth = 0,
            assignee = '',
            status = '未着手',
            plannedStart = '',
            plannedEnd = '',
            actualStart = '',
            actualEnd = '',
            notes = '',
            sortOrder,
            projectCode = '',
        } = req.body;

        const id = randomUUID();

        // 項番を自動採番（現在の最大値 + 1）
        const maxResult = db.prepare('SELECT MAX(item_number) as maxNum FROM wbs_tasks').get() as { maxNum: number | null };
        const itemNumber = (maxResult?.maxNum ?? 0) + 1;

        // sortOrderが指定されていない場合は項番と同じにする
        const order = sortOrder ?? itemNumber;

        db.prepare(`
      INSERT INTO wbs_tasks (id, item_number, category, task_name, parent_id, depth, assignee, status, planned_start, planned_end, actual_start, actual_end, notes, sort_order, project_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, itemNumber, category, taskName, parentId, depth, assignee, status, plannedStart, plannedEnd, actualStart, actualEnd, notes, order, projectCode);

        const newTask = db.prepare(`
      SELECT 
        id, item_number as itemNumber, category, task_name as taskName,
        parent_id as parentId, depth, assignee,
        status, planned_start as plannedStart, planned_end as plannedEnd,
        actual_start as actualStart, actual_end as actualEnd,
        notes, sort_order as sortOrder, project_code as projectCode,
        created_at as createdAt, updated_at as updatedAt
      FROM wbs_tasks WHERE id = ?
    `).get(id);

        res.status(201).json(newTask);
    } catch (error) {
        console.error('タスク追加エラー:', error);
        res.status(500).json({ error: 'タスクの追加に失敗しました' });
    }
});

/**
 * タスク更新
 * PUT /api/tasks/:id
 */
router.put('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const { id } = req.params;
        const updates = req.body;

        // 更新可能なフィールドのマッピング（camelCase → snake_case）
        const fieldMap: Record<string, string> = {
            category: 'category',
            taskName: 'task_name',
            parentId: 'parent_id',
            depth: 'depth',
            assignee: 'assignee',
            status: 'status',
            plannedStart: 'planned_start',
            plannedEnd: 'planned_end',
            actualStart: 'actual_start',
            actualEnd: 'actual_end',
            notes: 'notes',
            sortOrder: 'sort_order',
            itemNumber: 'item_number',
            projectCode: 'project_code',
        };

        const setClauses: string[] = [];
        const values: unknown[] = [];

        for (const [key, value] of Object.entries(updates)) {
            if (fieldMap[key]) {
                setClauses.push(`${fieldMap[key]} = ?`);
                values.push(value);
            }
        }

        if (setClauses.length === 0) {
            res.status(400).json({ error: '更新するフィールドがありません' });
            return;
        }

        // updated_atを自動更新
        setClauses.push("updated_at = datetime('now', 'localtime')");
        values.push(id);

        db.prepare(`UPDATE wbs_tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

        const updatedTask = db.prepare(`
      SELECT 
        id, item_number as itemNumber, category, task_name as taskName,
        parent_id as parentId, depth, assignee,
        status, planned_start as plannedStart, planned_end as plannedEnd,
        actual_start as actualStart, actual_end as actualEnd,
        notes, sort_order as sortOrder, project_code as projectCode,
        created_at as createdAt, updated_at as updatedAt
      FROM wbs_tasks WHERE id = ?
    `).get(id);

        if (!updatedTask) {
            res.status(404).json({ error: 'タスクが見つかりません' });
            return;
        }

        res.json(updatedTask);
    } catch (error) {
        console.error('タスク更新エラー:', error);
        res.status(500).json({ error: 'タスクの更新に失敗しました' });
    }
});

/**
 * タスク削除
 * DELETE /api/tasks/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const { id } = req.params;

        // 子タスクのparent_idをnullに設定
        db.prepare('UPDATE wbs_tasks SET parent_id = NULL, depth = 0 WHERE parent_id = ?').run(id);

        const result = db.prepare('DELETE FROM wbs_tasks WHERE id = ?').run(id);

        if (result.changes === 0) {
            res.status(404).json({ error: 'タスクが見つかりません' });
            return;
        }

        res.json({ message: '削除完了' });
    } catch (error) {
        console.error('タスク削除エラー:', error);
        res.status(500).json({ error: 'タスクの削除に失敗しました' });
    }
});

/**
 * 表示順変更（一括更新）
 * PUT /api/tasks/reorder
 */
router.put('/reorder', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const { orders } = req.body as { orders: { id: string; sortOrder: number }[] };

        const stmt = db.prepare('UPDATE wbs_tasks SET sort_order = ? WHERE id = ?');
        const updateAll = db.transaction((items: { id: string; sortOrder: number }[]) => {
            for (const item of items) {
                stmt.run(item.sortOrder, item.id);
            }
        });

        updateAll(orders);
        res.json({ message: '並び替え完了' });
    } catch (error) {
        console.error('並び替えエラー:', error);
        res.status(500).json({ error: '並び替えに失敗しました' });
    }
});

export default router;
