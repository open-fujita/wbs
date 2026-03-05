import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { randomUUID } from 'crypto';

const router = Router();

// SELECT節共通
const ISSUE_SELECT = `
    SELECT id, project_code as projectCode, title, description,
        priority, status, assignee, due_date as dueDate,
        created_at as createdAt, updated_at as updatedAt
    FROM issues`;

/**
 * 課題一覧取得（projectCodeフィルター対応）
 */
router.get('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const { projectCode } = req.query;

        let sql = ISSUE_SELECT;
        const params: unknown[] = [];

        if (projectCode) {
            sql += ' WHERE project_code = ?';
            params.push(projectCode);
        }
        sql += ' ORDER BY created_at DESC';

        const issues = db.prepare(sql).all(...params);
        res.json(issues);
    } catch (error) {
        console.error('課題取得エラー:', error);
        res.status(500).json({ error: '課題の取得に失敗しました' });
    }
});

/**
 * 課題作成
 */
router.post('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const {
            projectCode = '', title = '', description = '',
            priority = '中', status = '未対応',
            assignee = '', dueDate = '',
        } = req.body;

        const id = randomUUID();
        db.prepare(`
      INSERT INTO issues (id, project_code, title, description, priority, status, assignee, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, projectCode, title, description, priority, status, assignee, dueDate);

        const issue = db.prepare(`${ISSUE_SELECT} WHERE id = ?`).get(id);
        res.status(201).json(issue);
    } catch (error) {
        console.error('課題作成エラー:', error);
        res.status(500).json({ error: '課題の作成に失敗しました' });
    }
});

/**
 * 課題更新
 */
router.put('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const { id } = req.params;
        const fieldMap: Record<string, string> = {
            title: 'title', description: 'description',
            priority: 'priority', status: 'status',
            assignee: 'assignee', dueDate: 'due_date',
        };

        const setClauses: string[] = [];
        const values: unknown[] = [];
        for (const [key, value] of Object.entries(req.body)) {
            if (fieldMap[key]) {
                setClauses.push(`${fieldMap[key]} = ?`);
                values.push(value);
            }
        }

        if (setClauses.length === 0) {
            res.status(400).json({ error: '更新するフィールドがありません' });
            return;
        }

        setClauses.push("updated_at = datetime('now', 'localtime')");
        values.push(id);

        db.prepare(`UPDATE issues SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
        const issue = db.prepare(`${ISSUE_SELECT} WHERE id = ?`).get(id);
        res.json(issue);
    } catch (error) {
        console.error('課題更新エラー:', error);
        res.status(500).json({ error: '課題の更新に失敗しました' });
    }
});

/**
 * 課題削除
 */
router.delete('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const { id } = req.params;
        const result = db.prepare('DELETE FROM issues WHERE id = ?').run(id);

        if (result.changes === 0) {
            res.status(404).json({ error: '課題が見つかりません' });
            return;
        }
        res.json({ message: '削除完了' });
    } catch (error) {
        console.error('課題削除エラー:', error);
        res.status(500).json({ error: '課題の削除に失敗しました' });
    }
});

// コメント取得のSELECT句
const COMMENT_SELECT = `
    SELECT id, issue_id as issueId, content, user_name as userName, created_at as createdAt
    FROM issue_comments`;

/**
 * 課題に対するコメント一覧の取得
 */
router.get('/:id/comments', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const { id } = req.params;
        const comments = db.prepare(`${COMMENT_SELECT} WHERE issue_id = ? ORDER BY created_at ASC`).all(id);
        res.json(comments);
    } catch (error) {
        console.error('コメント取得エラー:', error);
        res.status(500).json({ error: 'コメントの取得に失敗しました' });
    }
});

/**
 * コメントの追加
 */
router.post('/:id/comments', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const { id } = req.params;
        const { content, userName = 'ユーザー' } = req.body;

        if (!content || !content.trim()) {
            res.status(400).json({ error: 'コメント内容がありません' });
            return;
        }

        const commentId = randomUUID();
        db.prepare(`
            INSERT INTO issue_comments (id, issue_id, content, user_name)
            VALUES (?, ?, ?, ?)
        `).run(commentId, id, content, userName);

        const comment = db.prepare(`${COMMENT_SELECT} WHERE id = ?`).get(commentId);
        res.status(201).json(comment);
    } catch (error) {
        console.error('コメント作成エラー:', error);
        res.status(500).json({ error: 'コメントの作成に失敗しました' });
    }
});

export default router;
