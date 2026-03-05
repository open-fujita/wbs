import React, { useState } from 'react';
import type { Project, PageType } from '../types';
import './Sidebar.css';

interface SidebarProps {
    projects: Project[];
    selectedProjectId: string | null;
    currentPage: PageType;
    onSelectProject: (projectId: string) => void;
    onChangePage: (page: PageType) => void;
    onCreateProject: () => void;
}

/**
 * V0ライクなサイドバー
 * モノクロアイコン、ミニマルデザイン、薄いボーダー
 */
export const Sidebar: React.FC<SidebarProps> = ({
    projects,
    selectedProjectId,
    currentPage,
    onSelectProject,
    onChangePage,
    onCreateProject,
}) => {
    // ツリーの開閉状態
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // プロジェクトツリーの再帰的レンダリング
    const renderProjectTree = (parentId: string | null = null, depth: number = 0) => {
        const children = projects.filter(p => (!p.parentId && parentId === null) || p.parentId === parentId);
        if (children.length === 0) return null;

        return children.map(project => {
            const hasChildren = projects.some(p => p.parentId === project.id);
            const isExpanded = expandedIds.has(project.id);

            return (
                <React.Fragment key={project.id}>
                    <div
                        className={`project-item ${selectedProjectId === project.id ? 'active' : ''}`}
                        onClick={() => onSelectProject(project.id)}
                        style={{ paddingLeft: `${16 + depth * 16}px` }}
                    >
                        <div className="project-item-toggle">
                            {hasChildren ? (
                                <button className="tree-toggle-btn" onClick={(e) => toggleExpand(e, project.id)}>
                                    {isExpanded ? '▼' : '▶'}
                                </button>
                            ) : (
                                <span className="tree-toggle-placeholder" />
                            )}
                        </div>
                        <svg className="project-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
                        </svg>
                        <div className="project-item-info">
                            <span className="project-item-name">{project.name || '無題のプロジェクト'}</span>
                            <span className="project-item-code">{project.projectCode}</span>
                        </div>
                    </div>
                    {hasChildren && isExpanded && renderProjectTree(project.id, depth + 1)}
                </React.Fragment>
            );
        });
    };

    return (
        <aside className="sidebar">
            {/* ロゴ */}
            <div className="sidebar-logo">
                <span className="logo-icon">◌</span>
                <span className="logo-text">WBS Manager</span>
            </div>

            {/* ナビゲーション */}
            <nav className="sidebar-nav">
                <div className="nav-section">
                    <button
                        className="nav-btn new-project-btn"
                        onClick={onCreateProject}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        新規プロジェクト
                    </button>
                </div>

                {/* プロジェクト一覧 */}
                <div className="nav-section">
                    <span className="nav-section-label">プロジェクト</span>
                    <div className="project-list">
                        {projects.length === 0 ? (
                            <span className="project-empty">プロジェクトなし</span>
                        ) : (
                            renderProjectTree(null, 0)
                        )}
                    </div>
                </div>
            </nav>

            {/* 選択中プロジェクトのサブナビ */}
            {selectedProjectId && (
                <div className="sidebar-subnav">
                    <span className="nav-section-label">ビュー</span>
                    <button
                        className={`subnav-btn ${currentPage === 'project-overview' ? 'active' : ''}`}
                        onClick={() => onChangePage('project-overview')}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                        </svg>
                        概要
                    </button>
                    <button
                        className={`subnav-btn ${currentPage === 'wbs' ? 'active' : ''}`}
                        onClick={() => onChangePage('wbs')}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <line x1="8" y1="6" x2="21" y2="6" />
                            <line x1="8" y1="12" x2="21" y2="12" />
                            <line x1="8" y1="18" x2="21" y2="18" />
                            <line x1="3" y1="6" x2="3.01" y2="6" />
                            <line x1="3" y1="12" x2="3.01" y2="12" />
                            <line x1="3" y1="18" x2="3.01" y2="18" />
                        </svg>
                        WBS
                    </button>
                    <button
                        className={`subnav-btn ${currentPage === 'issues' ? 'active' : ''}`}
                        onClick={() => onChangePage('issues')}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                        課題管理
                    </button>
                </div>
            )}
        </aside>
    );
};
