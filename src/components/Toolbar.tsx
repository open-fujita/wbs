import React from 'react';
import type { ViewMode } from '../types';
import './Toolbar.css';

interface ToolbarProps {
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    onAddTask: () => void;
    statusFilter: string;
    onStatusFilterChange: (status: string) => void;
    categoryFilter: string;
    onCategoryFilterChange: (category: string) => void;
    categories: string[];
}

/**
 * ツールバーコンポーネント
 * タスク追加、フィルター、ビュー切り替え
 */
export const Toolbar: React.FC<ToolbarProps> = ({
    viewMode,
    onViewModeChange,
    onAddTask,
    statusFilter,
    onStatusFilterChange,
    categoryFilter,
    onCategoryFilterChange,
    categories,
}) => {
    return (
        <div className="toolbar">
            <div className="toolbar-left">
                <button className="btn-primary" onClick={onAddTask}>
                    <span className="btn-icon">＋</span>
                    タスク追加
                </button>

                <div className="filter-group">
                    <label className="filter-label">ステータス</label>
                    <select
                        className="filter-select"
                        value={statusFilter}
                        onChange={(e) => onStatusFilterChange(e.target.value)}
                    >
                        <option value="">すべて</option>
                        <option value="未着手">未着手</option>
                        <option value="進行中">進行中</option>
                        <option value="完了">完了</option>
                        <option value="中断">中断</option>
                        <option value="取消">取消</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">カテゴリ</label>
                    <select
                        className="filter-select"
                        value={categoryFilter}
                        onChange={(e) => onCategoryFilterChange(e.target.value)}
                    >
                        <option value="">すべて</option>
                        {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="toolbar-right">
                <div className="view-toggle">
                    <button
                        className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                        onClick={() => onViewModeChange('table')}
                        title="テーブル表示"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="1" y="1" width="14" height="3" rx="0.5" />
                            <rect x="1" y="6" width="14" height="3" rx="0.5" />
                            <rect x="1" y="11" width="14" height="3" rx="0.5" />
                        </svg>
                    </button>
                    <button
                        className={`view-btn ${viewMode === 'gantt' ? 'active' : ''}`}
                        onClick={() => onViewModeChange('gantt')}
                        title="ガントチャート"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="2" y="1" width="8" height="3" rx="0.5" />
                            <rect x="5" y="6" width="10" height="3" rx="0.5" />
                            <rect x="1" y="11" width="6" height="3" rx="0.5" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
