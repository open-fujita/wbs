import React, { useState } from 'react';
import { generateChecklistItems } from '../lib/aiGenerate';
import './ChecklistAIModal.css';

interface ChecklistAIModalProps {
    onClose: () => void;
    onCreate: (title: string, items: { title: string }[]) => void;
}

const ITEM_COUNT_OPTIONS = [5, 8, 10, 15];

export const ChecklistAIModal: React.FC<ChecklistAIModalProps> = ({
    onClose, onCreate,
}) => {
    const [purpose, setPurpose] = useState('');
    const [itemCount, setItemCount] = useState(8);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // プレビュー状態
    const [previewTitle, setPreviewTitle] = useState('');
    const [previewItems, setPreviewItems] = useState<string[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');

    const handleGenerate = async () => {
        if (!purpose.trim()) {
            setError('チェックリストの目的を入力してください。');
            return;
        }

        setGenerating(true);
        setError(null);

        const result = await generateChecklistItems(purpose.trim(), itemCount);

        setGenerating(false);

        if (result.success) {
            setPreviewTitle(result.title);
            setPreviewItems(result.items);
            setShowPreview(true);
        } else {
            setError(result.error);
        }
    };

    const handleCreate = () => {
        const items = previewItems
            .filter(s => s.trim().length > 0)
            .map(s => ({ title: s }));
        if (items.length === 0) return;
        onCreate(previewTitle || '無題のチェックリスト', items);
    };

    const handleEditItem = (index: number) => {
        setEditingIndex(index);
        setEditValue(previewItems[index]);
    };

    const handleSaveEdit = () => {
        if (editingIndex === null) return;
        const next = [...previewItems];
        next[editingIndex] = editValue;
        setPreviewItems(next);
        setEditingIndex(null);
    };

    const handleDeleteItem = (index: number) => {
        setPreviewItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddItem = () => {
        setPreviewItems(prev => [...prev, '']);
        setEditingIndex(previewItems.length);
        setEditValue('');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content ai-modal" onClick={e => e.stopPropagation()}>
                <div className="ai-modal-header">
                    <h3 className="modal-title">AIでチェックリストを自動生成</h3>
                    <button className="template-close-btn" onClick={onClose}>×</button>
                </div>

                {!showPreview ? (
                    <>
                        <label className="ai-label">何のチェックリストを作りますか？</label>
                        <textarea
                            className="ai-purpose-input"
                            placeholder="例: React SPAアプリのリリース前に確認すべき項目"
                            value={purpose}
                            onChange={e => setPurpose(e.target.value)}
                            rows={3}
                        />

                        <div className="ai-options">
                            <label className="ai-label">生成する項目数:</label>
                            <select
                                className="ai-select"
                                value={itemCount}
                                onChange={e => setItemCount(Number(e.target.value))}
                            >
                                {ITEM_COUNT_OPTIONS.map(n => (
                                    <option key={n} value={n}>{n}項目</option>
                                ))}
                            </select>
                        </div>

                        {error && <div className="ai-error">{error}</div>}

                        <div className="ai-note">
                            ※ VITE_OPENAI_API_KEY の設定が必要です
                        </div>

                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={onClose}>キャンセル</button>
                            <button
                                className="btn-primary"
                                onClick={handleGenerate}
                                disabled={generating}
                            >
                                {generating ? (
                                    <span className="ai-generating">
                                        <span className="ai-spinner" />
                                        生成中...
                                    </span>
                                ) : '生成する'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <label className="ai-label">生成プレビュー</label>

                        <div className="ai-preview">
                            <div className="ai-preview-title-row">
                                <label className="ai-preview-label">タイトル:</label>
                                <input
                                    className="ai-preview-title-input"
                                    value={previewTitle}
                                    onChange={e => setPreviewTitle(e.target.value)}
                                />
                            </div>

                            <div className="ai-preview-items">
                                {previewItems.map((item, index) => (
                                    <div key={index} className="ai-preview-item">
                                        <span className="ai-preview-checkbox" />
                                        {editingIndex === index ? (
                                            <input
                                                className="ai-preview-item-edit"
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                onBlur={handleSaveEdit}
                                                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingIndex(null); }}
                                                autoFocus
                                            />
                                        ) : (
                                            <span
                                                className="ai-preview-item-text"
                                                onClick={() => handleEditItem(index)}
                                            >
                                                {item || '(クリックして編集)'}
                                            </span>
                                        )}
                                        <button
                                            className="ai-preview-item-delete"
                                            onClick={() => handleDeleteItem(index)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                <button className="ai-preview-add-btn" onClick={handleAddItem}>
                                    + 項目を追加
                                </button>
                            </div>
                        </div>

                        {error && <div className="ai-error">{error}</div>}

                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={onClose}>キャンセル</button>
                            <button
                                className="btn-secondary"
                                onClick={() => { setShowPreview(false); handleGenerate(); }}
                                disabled={generating}
                            >
                                {generating ? '生成中...' : '再生成'}
                            </button>
                            <button className="btn-primary" onClick={handleCreate}>
                                このまま作成
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
