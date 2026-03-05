import React, { useState, useEffect } from 'react';
import type { Issue, IssueComment, IssuePriority, IssueStatus } from '../types';
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from '../types';
import './IssueDetailModal.css';

interface IssueDetailModalProps {
    issue: Issue;
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<Issue>) => Promise<Issue | null>;
    fetchComments: (issueId: string) => Promise<IssueComment[]>;
    addComment: (issueId: string, content: string, userName?: string) => Promise<IssueComment | null>;
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({
    issue, onClose, onUpdate, fetchComments, addComment
}) => {
    const [comments, setComments] = useState<IssueComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(true);

    // 編集ステート
    const [form, setForm] = useState({
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        status: issue.status,
        assignee: issue.assignee,
        dueDate: issue.dueDate,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadComments = async () => {
            setLoadingComments(true);
            const data = await fetchComments(issue.id);
            setComments(data);
            setLoadingComments(false);
        };
        loadComments();
    }, [issue.id, fetchComments]);

    const handleSave = async () => {
        setSaving(true);
        await onUpdate(issue.id, form);
        setSaving(false);
        onClose();
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        const added = await addComment(issue.id, newComment);
        if (added) {
            setComments(prev => [...prev, added]);
            setNewComment('');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">課題の詳細</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* 左側: 課題情報編集 */}
                    <div className="modal-main">
                        <div className="form-group">
                            <label className="form-label">タイトル</label>
                            <input
                                className="form-input"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                            />
                        </div>

                        <div className="form-group-row">
                            <div className="form-group">
                                <label className="form-label">ステータス</label>
                                <select
                                    className="form-input"
                                    value={form.status}
                                    onChange={e => setForm({ ...form, status: e.target.value as IssueStatus })}
                                >
                                    {ISSUE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">優先度</label>
                                <select
                                    className="form-input"
                                    value={form.priority}
                                    onChange={e => setForm({ ...form, priority: e.target.value as IssuePriority })}
                                >
                                    {ISSUE_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group-row">
                            <div className="form-group">
                                <label className="form-label">担当者</label>
                                <input
                                    className="form-input"
                                    value={form.assignee}
                                    onChange={e => setForm({ ...form, assignee: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">期限</label>
                                <input
                                    className="form-input"
                                    type="date"
                                    value={form.dueDate}
                                    onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">詳細内容</label>
                            <textarea
                                className="form-input"
                                rows={4}
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? '保存中...' : '変更を保存'}
                            </button>
                        </div>
                    </div>

                    {/* 右側: 対応状況（コメント） */}
                    <div className="modal-sidebar">
                        <div className="comments-section">
                            <h3 className="comments-title">対応状況・コメント</h3>

                            <div className="comments-list">
                                {loadingComments ? (
                                    <div className="comments-loading">読み込み中...</div>
                                ) : comments.length === 0 ? (
                                    <div className="comments-empty">コメントはありません</div>
                                ) : (
                                    comments.map(c => (
                                        <div key={c.id} className="comment-item">
                                            <div className="comment-meta">
                                                <span className="comment-author">{c.userName}</span>
                                                <span className="comment-date">{c.createdAt}</span>
                                            </div>
                                            <div className="comment-body">{c.content}</div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="comment-input-area">
                                <textarea
                                    className="form-input"
                                    rows={3}
                                    placeholder="対応状況やコメントを入力..."
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                />
                                <button
                                    className="btn-secondary float-right"
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                >
                                    コメント投稿
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
