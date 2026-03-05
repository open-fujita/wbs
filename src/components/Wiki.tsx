import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Project, WikiFormat } from '../types';
import './Wiki.css';

interface WikiProps {
    project: Project;
    onUpdate: (id: string, updates: Partial<Project>) => Promise<Project | null>;
    onSaveSuccess?: () => void;
}

/** 選択範囲を囲む形式で挿入 */
function wrapSelection(text: string, start: number, end: number, before: string, after: string): { newText: string; newCursor: number } {
    const selected = text.slice(start, end) || 'テキスト';
    const newText = text.slice(0, start) + before + selected + after + text.slice(end);
    const newCursor = start + before.length + selected.length + after.length;
    return { newText, newCursor };
}

/** 行頭に挿入 */
function insertAtLineStart(text: string, cursor: number, prefix: string): { newText: string; newCursor: number } {
    const lineStart = text.lastIndexOf('\n', cursor - 1) + 1;
    const newText = text.slice(0, lineStart) + prefix + text.slice(lineStart);
    const newCursor = lineStart + prefix.length;
    return { newText, newCursor };
}

/**
 * プロジェクトWikiコンポーネント
 * テキストとMarkdown形式で切り替えて記載可能
 */
export const Wiki: React.FC<WikiProps> = ({ project, onUpdate, onSaveSuccess }) => {
    const [content, setContent] = useState(project.wikiContent ?? '');
    const [format, setFormat] = useState<WikiFormat>(project.wikiFormat ?? 'text');
    const [isEditing, setIsEditing] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setContent(project.wikiContent ?? '');
        setFormat((project.wikiFormat ?? 'text') as WikiFormat);
    }, [project.id, project.wikiContent, project.wikiFormat]);

    const handleSave = async () => {
        setSaveError(null);
        const updated = await onUpdate(project.id, { wikiContent: content, wikiFormat: format });
        if (updated) {
            setIsEditing(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            onSaveSuccess?.();
        } else {
            setSaveError('保存に失敗しました。もう一度お試しください。');
        }
    };

    const handleFormatChange = (newFormat: WikiFormat) => {
        setFormat(newFormat);
    };

    const insertMarkdown = useCallback((before: string, after: string, blockMode = false) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const result = blockMode
            ? insertAtLineStart(content, start, before)
            : wrapSelection(content, start, end, before, after);
        setContent(result.newText);
        requestAnimationFrame(() => {
            ta.focus();
            ta.setSelectionRange(result.newCursor, result.newCursor);
        });
    }, [content]);

    const mdButtons: { label: string; title: string; before: string; after: string; block?: boolean }[] = [
        { label: 'H1', title: '見出し1', before: '# ', after: '', block: true },
        { label: 'H2', title: '見出し2', before: '## ', after: '', block: true },
        { label: 'H3', title: '見出し3', before: '### ', after: '', block: true },
        { label: 'B', title: '太字', before: '**', after: '**' },
        { label: 'I', title: '斜体', before: '*', after: '*' },
        { label: 'S', title: '取り消し線', before: '~~', after: '~~' },
        { label: '-', title: '箇条書き', before: '- ', after: '', block: true },
        { label: '1.', title: '番号付きリスト', before: '1. ', after: '', block: true },
        { label: '`', title: 'インラインコード', before: '`', after: '`' },
        { label: '```', title: 'コードブロック', before: '```\n', after: '\n```' },
        { label: '>', title: '引用', before: '> ', after: '', block: true },
        { label: '[', title: 'リンク', before: '[', after: '](URL)' },
        { label: '---', title: '水平線', before: '\n---\n', after: '', block: true },
    ];

    return (
        <div className="wiki">
            <div className="wiki-header">
                <div>
                    <span className="wiki-project-code">{project.projectCode}</span>
                    <h2 className="wiki-title">{project.name || '無題のプロジェクト'}</h2>
                </div>
                <div className="wiki-toolbar">
                    {!isEditing ? (
                        <>
                            <span className="wiki-format-label">
                                形式: {format === 'markdown' ? 'Markdown' : 'テキスト'}
                            </span>
                            <button
                                type="button"
                                className="wiki-edit-btn"
                                onClick={() => setIsEditing(true)}
                            >
                                編集
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="wiki-format-toggle">
                                <button
                                    type="button"
                                    className={`format-btn ${format === 'text' ? 'active' : ''}`}
                                    onClick={() => handleFormatChange('text')}
                                >
                                    テキスト
                                </button>
                                <button
                                    type="button"
                                    className={`format-btn ${format === 'markdown' ? 'active' : ''}`}
                                    onClick={() => handleFormatChange('markdown')}
                                >
                                    Markdown
                                </button>
                            </div>
                            <button
                                type="button"
                                className="wiki-save-btn"
                                onClick={handleSave}
                            >
                                {saved ? '保存しました' : '保存'}
                            </button>
                            <button
                                type="button"
                                className="wiki-cancel-btn"
                                onClick={() => {
                                    setContent(project.wikiContent ?? '');
                                    setFormat((project.wikiFormat ?? 'text') as WikiFormat);
                                    setIsEditing(false);
                                }}
                            >
                                キャンセル
                            </button>
                        </>
                    )}
                </div>
            </div>

            {saveError && (
                <div className="wiki-error-banner">
                    {saveError}
                </div>
            )}
            <div className="wiki-body">
                {isEditing ? (
                    <div className="wiki-edit-area">
                        {format === 'markdown' && (
                            <div className="wiki-md-panel">
                                <span className="wiki-md-panel-label">挿入:</span>
                                <div className="wiki-md-buttons">
                                    {mdButtons.map((btn) => (
                                        <button
                                            key={btn.label}
                                            type="button"
                                            className="wiki-md-btn"
                                            title={btn.title}
                                            onClick={() => insertMarkdown(btn.before, btn.after, btn.block)}
                                        >
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <textarea
                            ref={textareaRef}
                            className="wiki-textarea"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={format === 'markdown' ? 'Markdown形式で記述できます。上のパネルから書式を挿入できます。' : 'テキストを入力してください'}
                            spellCheck={false}
                        />
                    </div>
                ) : (
                    <div className="wiki-content">
                        {content ? (
                            format === 'markdown' ? (
                                <div className="wiki-markdown">
                                    <ReactMarkdown>{content}</ReactMarkdown>
                                </div>
                            ) : (
                                <pre className="wiki-plaintext">{content}</pre>
                            )
                        ) : (
                            <p className="wiki-empty">
                                まだ内容がありません。「編集」をクリックして追加してください。
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
