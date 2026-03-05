// タスクの進捗ステータス
export type TaskStatus = '未着手' | '進行中' | '完了' | '中断' | '取消';

// WBSタスクのデータ型
export interface WBSTask {
    id: string;
    itemNumber: number;
    category: string;
    taskName: string;
    parentId: string | null;
    depth: number;
    assignee: string;
    status: TaskStatus;
    plannedStart: string;
    plannedEnd: string;
    actualStart: string;
    actualEnd: string;
    notes: string;
    sortOrder: number;
    projectCode: string;     // プロジェクトコード
    createdAt?: string;
    updatedAt?: string;
}

// プロジェクトカテゴリ
export type ProjectCategory = 'システム企画' | 'システム導入' | '新規事業企画' | 'トラブル対応' | 'その他';
export const PROJECT_CATEGORIES: ProjectCategory[] = ['システム企画', 'システム導入', '新規事業企画', 'トラブル対応', 'その他'];

// プロジェクトのデータ型
export interface Project {
    id: string;
    projectCode: string;
    name: string;
    category: ProjectCategory | string;
    purpose: string;
    plannedStart: string;
    plannedEnd: string;
    parentId?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

// タスク作成用（IDなし）
export type CreateTaskInput = Omit<WBSTask, 'id' | 'itemNumber' | 'sortOrder' | 'createdAt' | 'updatedAt'> & {
    sortOrder?: number;
};

// タスク更新用（部分更新）
export type UpdateTaskInput = Partial<Omit<WBSTask, 'id' | 'createdAt' | 'updatedAt'>>;

// ステータスごとの色定義
export const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; border: string }> = {
    '未着手': { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' },
    '進行中': { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' },
    '完了': { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
    '中断': { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' },
    '取消': { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
};

// 利用可能なステータス一覧
export const TASK_STATUSES: TaskStatus[] = ['未着手', '進行中', '完了', '中断', '取消'];

// ビュー切り替え用
export type ViewMode = 'table' | 'gantt';

// サイドバーのページ種別
export type PageType = 'project-overview' | 'wbs' | 'issues';

// 課題の優先度
export type IssuePriority = '高' | '中' | '低';
export const ISSUE_PRIORITIES: IssuePriority[] = ['高', '中', '低'];

// 課題のステータス
export type IssueStatus = '未対応' | '対応中' | '完了';
export const ISSUE_STATUSES: IssueStatus[] = ['未対応', '対応中', '完了'];

// 課題のデータ型
export interface Issue {
    id: string;
    projectCode: string;
    title: string;
    description: string;
    priority: IssuePriority;
    status: IssueStatus;
    assignee: string;
    dueDate: string;
    createdAt?: string;
    updatedAt?: string;
}

// 課題のコメント
export interface IssueComment {
    id: string;
    issueId: string;
    content: string;
    userName: string;
    createdAt: string;
}
