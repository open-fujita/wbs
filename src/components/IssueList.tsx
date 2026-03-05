import React, { useState, useMemo } from 'react';
import type { Issue, IssueComment, IssuePriority, IssueStatus } from '../types';
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from '../types';
import { IssueDetailModal } from './IssueDetailModal';
import './IssueList.css';

interface IssueListProps {
    issues: Issue[];
    onCreate: (input: Partial<Issue>) => Promise<Issue | null>;
    onUpdate: (id: string, updates: Partial<Issue>) => Promise<Issue | null>;
    onDelete: (id: string) => Promise<boolean>;
    fetchComments: (issueId: string) => Promise<IssueComment[]>;
    addComment: (issueId: string, content: string, userName?: string) => Promise<IssueComment | null>;
}

/**
 * 課題管理ビュー（カンバンボード形式）
 */
export const IssueList: React.FC<IssueListProps> = ({
    issues, onCreate, onUpdate, onDelete, fetchComments, addComment
}) => {
    const [showForm, setShowForm] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
    const [form, setForm] = useState({
        title: '', description: '', priority: '中' as IssuePriority,
        assignee: '', dueDate: '', status: '未対応' as IssueStatus,
    });

    // ステータス別に課題をフィルタリング
    const issuesByStatus = useMemo(() => {
        const grouped: Record<IssueStatus, Issue[]> = {
            '未対応': [], '対応中': [], '完了': []
        };
        issues.forEach(i => {
            if (grouped[i.status]) grouped[i.status].push(i);
        });
        return grouped;
    }, [issues]);

    // フォームリセット
    const resetForm = () => {
        setForm({ title: '', description: '', priority: '中', assignee: '', dueDate: '', status: '未対応' });
        setShowForm(false);
    };

    // 課題追加
    const handleCreate = async () => {
        if (!form.title.trim()) return;
        await onCreate(form);
        resetForm();
    };

    // 課題更新（モーダル内から）
    const handleUpdateIssue = async (id: string, updates: Partial<Issue>) => {
        const updated = await onUpdate(id, updates);
        if (updated && selectedIssue?.id === id) {
            setSelectedIssue(updated);
        }
        return updated;
    };

    // 削除（カード上から）
    const handleDelete = (e: React.MouseEvent, id: string, title: string) => {
        e.stopPropagation();
        if (window.confirm(`「${title || '無題'}」を削除しますか？`)) {
            onDelete(id);
        }
    };

    // 優先度ごとのバッジスタイル
    const priorityClass = (p: string) => {
        switch (p) {
            case '高': return 'priority-high';
            case '中': return 'priority-medium';
            case '低': return 'priority-low';
            default: return '';
        }
    };

    // カラムレンダリング
    const renderColumn = (status: IssueStatus) => {
        const columnIssues = issuesByStatus[status];
        return (
            <div className="kanban-column" key={status}>
                <div className="kanban-column-header">
                    <h3 className="kanban-column-title">{status}</h3>
                    <span className="kanban-column-count">{columnIssues.length}</span>
                </div>
                <div className="kanban-cards">
                    {columnIssues.map(issue => (
                        <div
                            key={issue.id}
                            className={`kanban-card ${issue.status === '完了' ? 'done' : ''}`}
                            onClick={() => setSelectedIssue(issue)}
                        >
                            <div className="kanban-card-header">
                                <span className={`issue-priority ${priorityClass(issue.priority)}`}>
                                    {issue.priority}
                                </span>
                                <button className="card-delete-btn" onClick={(e) => handleDelete(e, issue.id, issue.title)}>×</button>
                            </div>
                            <h4 className="kanban-card-title">{issue.title || '無題'}</h4>
                            <div className="kanban-card-meta">
                                {issue.assignee && <span className="meta-tag">👤 {issue.assignee}</span>}
                                {issue.dueDate && <span className="meta-tag">📅 {issue.dueDate}</span>}
                            </div>
                        </div>
                    ))}
                    {columnIssues.length === 0 && (
                        <div className="kanban-empty">課題なし</div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="issue-board">
            <div className="issue-header">
                <div>
                    <h2 className="issue-title">課題ボード</h2>
                    <p className="issue-desc">カードをクリックすると、対応状況（コメント履歴）の確認や詳細編集ができます。</p>
                </div>
                <button
                    className="issue-add-btn"
                    onClick={() => { resetForm(); setShowForm(true); }}
                >
                    + 課題を追加
                </button>
            </div>

            {/* 新規追加フォーム */}
            {showForm && (
                <div className="issue-form">
                    <input
                        className="issue-form-input"
                        placeholder="課題タイトル"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        autoFocus
                    />
                    <div className="issue-form-row">
                        <select
                            className="issue-form-select"
                            value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value as IssueStatus })}
                        >
                            {ISSUE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select
                            className="issue-form-select"
                            value={form.priority}
                            onChange={e => setForm({ ...form, priority: e.target.value as IssuePriority })}
                        >
                            {ISSUE_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input
                            className="issue-form-input slim"
                            value={form.assignee}
                            onChange={e => setForm({ ...form, assignee: e.target.value })}
                            placeholder="担当者名"
                        />
                        <input
                            className="issue-form-input slim"
                            type="date"
                            value={form.dueDate}
                            onChange={e => setForm({ ...form, dueDate: e.target.value })}
                        />
                    </div>
                    <div className="issue-form-actions">
                        <button className="btn-primary" onClick={handleCreate}>追加</button>
                        <button className="btn-secondary" onClick={resetForm}>キャンセル</button>
                    </div>
                </div>
            )}

            {/* カンバンボード */}
            <div className="kanban-board">
                {ISSUE_STATUSES.map(status => renderColumn(status))}
            </div>

            {/* 詳細モーダル（コメント対応） */}
            {selectedIssue && (
                <IssueDetailModal
                    issue={selectedIssue}
                    onClose={() => setSelectedIssue(null)}
                    onUpdate={handleUpdateIssue}
                    fetchComments={fetchComments}
                    addComment={addComment}
                />
            )}
        </div>
    );
};
