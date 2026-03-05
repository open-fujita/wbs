import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { randomUUID } from 'crypto';

const router = Router();

// プロジェクトコード自動採番用ヘルパー
function generateProjectCode(db: ReturnType<typeof getDatabase>): string {
    const result = db.prepare(
        "SELECT project_code FROM projects ORDER BY created_at DESC LIMIT 1"
    ).get() as { project_code: string } | undefined;

    if (!result) return 'PRJ-001';

    const match = result.project_code.match(/PRJ-(\d+)/);
    const nextNum = match ? parseInt(match[1], 10) + 1 : 1;
    return `PRJ-${String(nextNum).padStart(3, '0')}`;
}

// SELECT節共通
const PROJECT_SELECT = `
  SELECT id, project_code as projectCode, name, category, purpose,
         planned_start as plannedStart, planned_end as plannedEnd, parent_id as parentId,
         wiki_content as wikiContent, wiki_format as wikiFormat,
         created_at as createdAt, updated_at as updatedAt
  FROM projects`;

/**
 * プロジェクト一覧取得
 */
/**
 * カテゴリ別WBSテンプレート定義
 * 各カテゴリに最適化されたフェーズ構成とサブタスク
 */
type WBSTemplate = { category: string; tasks: string[] }[];

const WBS_TEMPLATES: Record<string, WBSTemplate> = {
    'システム企画': [
        { category: '現状分析', tasks: ['業務フロー分析', '課題整理', '要件ヒアリング'] },
        { category: '企画立案', tasks: ['基本構想策定', '概算見積', '投資対効果分析'] },
        { category: '提案', tasks: ['提案書作成', 'ステークホルダー説明', '承認取得'] },
        { category: '要件定義', tasks: ['機能要件定義', '非機能要件定義', '要件レビュー'] },
    ],
    'システム導入': [
        { category: '要件定義', tasks: ['要件ヒアリング', '要件定義書作成', '要件確定'] },
        { category: '設計', tasks: ['基本設計', '詳細設計', '設計レビュー'] },
        { category: '開発/構築', tasks: ['環境構築', '開発/設定', '単体テスト'] },
        { category: 'テスト', tasks: ['結合テスト', 'ユーザ受入テスト', '性能テスト'] },
        { category: '移行', tasks: ['データ移行', '並行運用', '本番切替'] },
        { category: '運用定着', tasks: ['操作研修', 'マニュアル整備', '運用引継ぎ'] },
    ],
    '新規事業企画': [
        { category: '市場調査', tasks: ['市場分析', '競合調査', 'ターゲット分析'] },
        { category: '事業計画', tasks: ['ビジネスモデル設計', '収支計画', 'リスク分析'] },
        { category: '検証', tasks: ['POC/MVP開発', '検証実施', '結果分析'] },
        { category: '準備', tasks: ['体制構築', 'パートナー選定', '法務対応'] },
        { category: '立ち上げ', tasks: ['プレローンチ', '本格ローンチ', '効果測定'] },
    ],
    'トラブル対応': [
        { category: '初動対応', tasks: ['状況把握', '影響範囲特定', '暫定対応'] },
        { category: '原因調査', tasks: ['ログ分析', '原因特定', '再現確認'] },
        { category: '恒久対策', tasks: ['対策立案', '対策実施', '動作確認'] },
        { category: '再発防止', tasks: ['原因分析(なぜなぜ)', '再発防止策策定', '水平展開'] },
        { category: '報告', tasks: ['報告書作成', '関係者報告', 'ナレッジ化'] },
    ],
    'その他': [
        { category: '企画', tasks: ['要件定義', '企画書作成', '承認プロセス'] },
        { category: '設計', tasks: ['基本設計', '詳細設計', 'デザインレビュー'] },
        { category: '実行', tasks: ['環境準備', '実施', 'レビュー'] },
        { category: '検証', tasks: ['テスト計画', 'テスト実施', '改善対応'] },
        { category: '完了', tasks: ['成果物整理', '報告', '振り返り'] },
    ],
};

/**
 * 全プロジェクト取得
 */
router.get('/', (_req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const projects = db.prepare(`${PROJECT_SELECT} ORDER BY created_at DESC`).all();
        res.json(projects);
    } catch (error) {
        console.error('プロジェクト取得エラー:', error);
        res.status(500).json({ error: 'プロジェクトの取得に失敗しました' });
    }
});

/**
 * プロジェクト作成
 */
router.post('/', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const { name = '', category = '', purpose = '', plannedStart = '', plannedEnd = '', parentId = '' } = req.body;
        const id = randomUUID();

        // プロジェクトコードの自動採番 (PRJ-XXX)
        const countRes = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
        const projectCode = `PRJ-${String(countRes.count + 1).padStart(3, '0')}`;

        db.prepare(`
      INSERT INTO projects (id, project_code, name, category, purpose, planned_start, planned_end, parent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, projectCode, name, category, purpose, plannedStart, plannedEnd, parentId);

        const project = db.prepare(`${PROJECT_SELECT} WHERE id = ?`).get(id);
        res.status(201).json(project);
    } catch (error) {
        console.error('プロジェクト作成エラー:', error);
        res.status(500).json({ error: 'プロジェクトの作成に失敗しました' });
    }
});

/**
 * プロジェクト更新
 */
router.put('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const { id } = req.params;
        const fieldMap: Record<string, string> = {
            name: 'name', category: 'category', purpose: 'purpose',
            plannedStart: 'planned_start', plannedEnd: 'planned_end',
            parentId: 'parent_id',
            wikiContent: 'wiki_content', wikiFormat: 'wiki_format'
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

        db.prepare(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
        const project = db.prepare(`${PROJECT_SELECT} WHERE id = ?`).get(id);
        res.json(project);
    } catch (error) {
        console.error('プロジェクト更新エラー:', error);
        res.status(500).json({ error: 'プロジェクトの更新に失敗しました' });
    }
});

/**
 * プロジェクト削除
 * 関連するWBSタスクも一括削除、課題と子プロジェクトの紐付けは解除（親なしに）
 */
router.delete('/:id', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const { id } = req.params;

        // プロジェクトコードを取得
        const project = db.prepare('SELECT project_code FROM projects WHERE id = ?').get(id) as { project_code: string } | undefined;

        db.transaction(() => {
            // プロジェクト削除
            const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);

            // 子プロジェクトの親IDをクリア（トップレベルに昇格）
            db.prepare("UPDATE projects SET parent_id = '' WHERE parent_id = ?").run(id);

            if (project) {
                // 紐づくタスクを削除
                db.prepare('DELETE FROM wbs_tasks WHERE project_code = ?').run(project.project_code);
                // 紐づく課題のプロジェクトコードをクリア
                db.prepare("UPDATE issues SET project_code = '' WHERE project_code = ?").run(project.project_code);
            }

            if (result.changes === 0) {
                return res.status(404).json({ error: 'プロジェクトが見つかりません' });
            }
            res.json({ message: '削除完了' });
        })();
    } catch (error) {
        console.error('プロジェクト削除エラー:', error);
        res.status(500).json({ error: 'プロジェクトの削除に失敗しました' });
    }
});

/**
 * WBS自動生成（カテゴリ別テンプレート対応）
 * プロジェクトのカテゴリ・目的・日程を考慮してインテリジェントに生成
 */
router.post('/:id/generate-wbs', (req: Request, res: Response) => {
    try {
        const db = getDatabase();
        const { id } = req.params;

        const project = db.prepare(
            'SELECT project_code, name, category, purpose, planned_start, planned_end FROM projects WHERE id = ?'
        ).get(id) as {
            project_code: string; name: string; category: string;
            purpose: string; planned_start: string; planned_end: string;
        } | undefined;

        if (!project) {
            res.status(404).json({ error: 'プロジェクトが見つかりません' });
            return;
        }

        // カテゴリに応じたテンプレートを選択
        const templateKey = project.category && WBS_TEMPLATES[project.category]
            ? project.category : 'その他';
        const template = WBS_TEMPLATES[templateKey];

        // 日程計算
        const start = project.planned_start ? new Date(project.planned_start) : new Date();
        const end = project.planned_end
            ? new Date(project.planned_end)
            : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000); // デフォルト3ヶ月

        const totalDays = Math.max(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
            template.length
        );

        // フェーズごとの重み付け（カテゴリ特性に応じて配分）
        const phaseWeights = getPhaseWeights(templateKey, template.length);
        const totalWeight = phaseWeights.reduce((a, b) => a + b, 0);

        // 現在のプロジェクトの既存タスクを削除（再生成の場合）
        db.prepare('DELETE FROM wbs_tasks WHERE project_code = ?').run(project.project_code);

        // 項番を1から採番
        let itemNumber = 1;
        let sortOrder = 1;

        const insertStmt = db.prepare(`
      INSERT INTO wbs_tasks (id, item_number, category, task_name, parent_id, depth, assignee, status, planned_start, planned_end, actual_start, actual_end, notes, sort_order, project_code)
      VALUES (?, ?, ?, ?, ?, ?, '', '未着手', ?, ?, '', '', '', ?, ?)
    `);

        let createdCount = 0;
        let currentStart = start;

        const generateAll = db.transaction(() => {
            template.forEach((phase, phaseIdx) => {
                // 重み付けによる日数配分
                const phaseDays = Math.max(Math.floor(totalDays * phaseWeights[phaseIdx] / totalWeight), 1);
                const phaseEnd = new Date(currentStart.getTime() + phaseDays * 24 * 60 * 60 * 1000);
                const phaseStartStr = currentStart.toISOString().split('T')[0];
                const phaseEndStr = phaseEnd.toISOString().split('T')[0];

                // 親タスク（フェーズ）
                const parentId = randomUUID();
                insertStmt.run(parentId, itemNumber++, phase.category, phase.category, null, 0, phaseStartStr, phaseEndStr, sortOrder++, project.project_code);
                createdCount++;

                // サブタスク
                const subDays = Math.max(Math.floor(phaseDays / phase.tasks.length), 1);
                let subStart = currentStart;
                phase.tasks.forEach((taskName) => {
                    const subEnd = new Date(subStart.getTime() + subDays * 24 * 60 * 60 * 1000);
                    const childId = randomUUID();
                    insertStmt.run(
                        childId, itemNumber++, phase.category, taskName, parentId, 1,
                        subStart.toISOString().split('T')[0],
                        subEnd.toISOString().split('T')[0],
                        sortOrder++, project.project_code
                    );
                    createdCount++;
                    subStart = subEnd;
                });

                currentStart = phaseEnd;
            });
        });

        generateAll();

        res.status(201).json({
            message: `${createdCount}件のタスクを生成しました（${templateKey}テンプレート）`,
            taskCount: createdCount,
            projectCode: project.project_code,
            templateUsed: templateKey,
        });
    } catch (error) {
        console.error('WBS自動生成エラー:', error);
        res.status(500).json({ error: 'WBSの自動生成に失敗しました' });
    }
});

/**
 * カテゴリ特性に応じたフェーズ重み付け
 * 前工程（企画・分析）と後工程（テスト・定着）に適切な時間を割り当て
 */
function getPhaseWeights(category: string, phaseCount: number): number[] {
    switch (category) {
        case 'システム企画':
            // 前半の分析・企画に重点
            return [3, 3, 2, 2];
        case 'システム導入':
            // 設計・開発・テストに重点
            return [2, 3, 4, 3, 2, 2];
        case '新規事業企画':
            // 調査・検証に重点
            return [3, 3, 3, 2, 2];
        case 'トラブル対応':
            // 初動は短く、調査・対策に重点
            return [1, 3, 3, 2, 1];
        default:
            // 均等配分
            return Array(phaseCount).fill(1);
    }
}

export default router;
