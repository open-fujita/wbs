import React, { useState, useEffect, useRef } from 'react';
import type { Project } from '../types';
import { PROJECT_CATEGORIES } from '../types';
import './ProjectOverview.css';

interface ProjectOverviewProps {
    project: Project;
    allProjects: Project[];
    onUpdate: (id: string, updates: Partial<Project>) => void;
    onDelete: (id: string) => void;
    onGenerateWBS: (projectId: string) => Promise<unknown>;
    onNavigateToWBS: () => void;
}

/**
 * プロジェクト概要コンポーネント
 * V0ライクなクリーンフォーム
 */
export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
    project, allProjects, onUpdate, onDelete, onGenerateWBS, onNavigateToWBS,
}) => {
    const [form, setForm] = useState({
        name: project.name,
        category: project.category || '',
        purpose: project.purpose,
        plannedStart: project.plannedStart,
        plannedEnd: project.plannedEnd,
        parentId: project.parentId || '',
    });
    const [generating, setGenerating] = useState(false);
    const [saved, setSaved] = useState(false);

    // プロジェクト切り替え時にフォームをリセット
    useEffect(() => {
        setForm({
            name: project.name,
            category: project.category || '',
            purpose: project.purpose,
            plannedStart: project.plannedStart,
            plannedEnd: project.plannedEnd,
            parentId: project.parentId || '',
        });
        setParentSearch('');
        setParentDropdownOpen(false);
    }, [project.id, project.name, project.category, project.purpose, project.plannedStart, project.plannedEnd, project.parentId]);

    // 自分自身とその子孫を親の候補から除外するための処理
    const getInvalidParentIds = (startId: string): Set<string> => {
        const invalidIds = new Set<string>([startId]);
        let currentLevel = [startId];
        while (currentLevel.length > 0) {
            const nextLevel = allProjects
                .filter(p => p.parentId && currentLevel.includes(p.parentId))
                .map(p => p.id);
            nextLevel.forEach(id => invalidIds.add(id));
            currentLevel = nextLevel;
        }
        return invalidIds;
    };

    const invalidParentIds = getInvalidParentIds(project.id);
    const validParentCandidates = allProjects.filter(p => !invalidParentIds.has(p.id));

    // 親プロジェクト検索
    const [parentSearch, setParentSearch] = useState('');
    const [parentDropdownOpen, setParentDropdownOpen] = useState(false);
    const parentWrapRef = useRef<HTMLDivElement>(null);

    const selectedParent = validParentCandidates.find(p => p.id === form.parentId);
    const filteredParents = parentSearch.trim()
        ? validParentCandidates.filter(p => {
            const q = parentSearch.trim().toLowerCase();
            const name = (p.name || '').toLowerCase();
            const code = (p.projectCode || '').toLowerCase();
            return name.includes(q) || code.includes(q);
        })
        : validParentCandidates;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (parentWrapRef.current && !parentWrapRef.current.contains(e.target as Node)) {
                setParentDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleParentSelect = (p: Project | null) => {
        handleChange('parentId', p ? p.id : '');
        setParentSearch('');
        setParentDropdownOpen(false);
    };

    // フィールド更新
    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    // 保存
    const handleSave = () => {
        onUpdate(project.id, form);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    // WBS自動生成
    const handleGenerateWBS = async () => {
        const cat = form.category || 'その他';
        if (!window.confirm(
            `WBSを自動生成しますか？\n` +
            `\nテンプレート: 「${cat}」\n` +
            `\n※ 既存のWBSタスクはクリアされ、新たに生成されます。`
        )) return;
        setGenerating(true);
        const result = await onGenerateWBS(project.id);
        setGenerating(false);
        if (result) {
            onNavigateToWBS();
        }
    };

    // 削除
    const handleDelete = () => {
        if (window.confirm(`「${project.name || project.projectCode}」を削除しますか？`)) {
            onDelete(project.id);
        }
    };

    return (
        <div className="overview">
            {/* ヘッダー */}
            <div className="overview-header">
                <div>
                    <span className="overview-code">{project.projectCode}</span>
                    <h2 className="overview-title">{project.name || '無題のプロジェクト'}</h2>
                </div>
            </div>

            {/* フォーム */}
            <div className="overview-form">
                <div className="form-group">
                    <label className="form-label">プロジェクト名</label>
                    <input
                        className="form-input"
                        value={form.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="プロジェクト名を入力..."
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">カテゴリ</label>
                    <select
                        className="form-input"
                        value={form.category}
                        onChange={(e) => handleChange('category', e.target.value)}
                    >
                        <option value="">選択してください...</option>
                        {PROJECT_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <span className="form-hint">WBS自動生成時のテンプレートが変わります</span>
                </div>

                <div className="form-group parent-project-group" ref={parentWrapRef}>
                    <label className="form-label">親プロジェクト</label>
                    <div className="parent-project-input-wrap">
                        <input
                            type="text"
                            className="form-input"
                            value={parentDropdownOpen ? parentSearch : (selectedParent ? `${selectedParent.name || selectedParent.projectCode} (${selectedParent.projectCode})` : '')}
                            onChange={(e) => {
                                setParentSearch(e.target.value);
                                setParentDropdownOpen(true);
                            }}
                            onFocus={() => setParentDropdownOpen(true)}
                            placeholder="名前またはコードで検索..."
                        />
                        {parentDropdownOpen && (
                            <div className="parent-project-dropdown">
                                <button
                                    type="button"
                                    className="parent-project-option"
                                    onClick={() => handleParentSelect(null)}
                                >
                                    (なし / トップレベル)
                                </button>
                                {filteredParents.length === 0 ? (
                                    <div className="parent-project-empty">該当なし</div>
                                ) : (
                                    filteredParents.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            className={`parent-project-option ${form.parentId === p.id ? 'selected' : ''}`}
                                            onClick={() => handleParentSelect(p)}
                                        >
                                            <span className="parent-project-name">{p.name || '無題'}</span>
                                            <span className="parent-project-code">{p.projectCode}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">目的</label>
                    <textarea
                        className="form-textarea"
                        value={form.purpose}
                        onChange={(e) => handleChange('purpose', e.target.value)}
                        placeholder="このプロジェクトの目的・ゴールを記述..."
                        rows={4}
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">予定開始日</label>
                        <input
                            className="form-input"
                            type="date"
                            value={form.plannedStart}
                            onChange={(e) => handleChange('plannedStart', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">予定終了日</label>
                        <input
                            className="form-input"
                            type="date"
                            value={form.plannedEnd}
                            onChange={(e) => handleChange('plannedEnd', e.target.value)}
                        />
                    </div>
                </div>

                {/* アクション */}
                <div className="form-actions">
                    <button className="btn-save" onClick={handleSave}>
                        {saved ? '✓ 保存しました' : '保存'}
                    </button>
                    <button
                        className="btn-generate"
                        onClick={handleGenerateWBS}
                        disabled={generating}
                    >
                        {generating ? '生成中...' : 'WBS を自動生成'}
                    </button>
                    <button className="btn-delete" onClick={handleDelete}>
                        削除
                    </button>
                </div>
            </div>

            {/* プロジェクト情報 */}
            <div className="overview-meta">
                <div className="meta-item">
                    <span className="meta-label">プロジェクトコード</span>
                    <span className="meta-value mono">{project.projectCode}</span>
                </div>
                {project.createdAt && (
                    <div className="meta-item">
                        <span className="meta-label">作成日</span>
                        <span className="meta-value">{project.createdAt}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
