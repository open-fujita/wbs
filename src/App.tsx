import { useState, useMemo, useCallback, useEffect } from 'react';
import { useWBSData } from './hooks/useWBSData';
import { useProjects } from './hooks/useProjects';
import { useIssues } from './hooks/useIssues';
import { WBSTable } from './components/WBSTable';
import { GanttChart } from './components/GanttChart';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { ProjectOverview } from './components/ProjectOverview';
import { IssueList } from './components/IssueList';
import { Wiki } from './components/Wiki';
import type { ViewMode, PageType } from './types';
import './App.css';

/**
 * WBS管理アプリケーション メインコンポーネント
 * V0ライクなサイドバー + メインコンテンツのレイアウト
 */
function App() {
  const {
    projects, createProject, updateProject, deleteProject, generateWBS,
  } = useProjects();

  // 選択中のプロジェクト
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<PageType>('project-overview');

  const selectedProject = useMemo(
    () => projects.find(p => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  // 選択プロジェクトのWBSデータ
  const {
    hierarchicalTasks, loading: wbsLoading, error: wbsError,
    addTask, updateTask, deleteTask, addSubTask, fetchTasks,
  } = useWBSData(selectedProject?.projectCode);

  // 選択プロジェクトの課題データ
  const {
    issues, createIssue, updateIssue, deleteIssue,
    fetchComments, addComment
  } = useIssues(selectedProject?.projectCode);

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // プロジェクトビュー（サイドバー）の幅（ドラッグでリサイズ可能）
  const SIDEBAR_MIN = 180;
  const SIDEBAR_MAX = 480;
  const SIDEBAR_DEFAULT = 240;
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('wbs-sidebar-width');
    if (saved) {
      const n = parseInt(saved, 10);
      if (!isNaN(n) && n >= SIDEBAR_MIN && n <= SIDEBAR_MAX) return n;
    }
    return SIDEBAR_DEFAULT;
  });

  useEffect(() => {
    localStorage.setItem('wbs-sidebar-width', String(sidebarWidth));
  }, [sidebarWidth]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth + delta));
      setSidebarWidth(next);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  // カテゴリ一覧
  const categories = useMemo(() => {
    const cats = new Set(hierarchicalTasks.map(t => t.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [hierarchicalTasks]);

  // フィルタリング
  const filteredTasks = useMemo(() => {
    return hierarchicalTasks.filter(task => {
      if (statusFilter && task.status !== statusFilter) return false;
      if (categoryFilter && task.category !== categoryFilter) return false;
      return true;
    });
  }, [hierarchicalTasks, statusFilter, categoryFilter]);

  // 新規プロジェクト作成
  const handleCreateProject = async () => {
    const project = await createProject({ name: '', purpose: '' });
    if (project) {
      setSelectedProjectId(project.id);
      setCurrentPage('project-overview');
    }
  };

  // プロジェクト選択
  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setStatusFilter('');
    setCategoryFilter('');
  };

  // プロジェクト削除
  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    if (selectedProjectId === id) {
      setSelectedProjectId(null);
    }
  };

  // WBS自動生成
  const handleGenerateWBS = async (projectId: string) => {
    const result = await generateWBS(projectId);
    if (result) {
      await fetchTasks();
    }
    return result;
  };

  // タスク追加
  const handleAddTask = async () => {
    await addTask({
      category: '',
      taskName: '',
      parentId: null,
      depth: 0,
      assignee: '',
      status: '未着手',
      plannedStart: '',
      plannedEnd: '',
      actualStart: '',
      actualEnd: '',
      notes: '',
      projectCode: selectedProject?.projectCode || '',
    });
  };

  // タスク削除
  const handleDelete = async (id: string) => {
    const task = hierarchicalTasks.find(t => t.id === id);
    if (!task) return;
    const name = task.taskName || '（無題）';
    if (window.confirm(`「${name}」を削除しますか？`)) {
      await deleteTask(id);
    }
  };

  return (
    <div className="app-layout">
      {/* プロジェクトビュー（サイドバー） */}
      <div
        className="sidebar-wrapper"
        style={{ width: sidebarWidth, minWidth: SIDEBAR_MIN, maxWidth: SIDEBAR_MAX }}
      >
        <Sidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          currentPage={currentPage}
          onSelectProject={handleSelectProject}
          onChangePage={setCurrentPage}
          onCreateProject={handleCreateProject}
        />
      </div>

      {/* リサイズハンドル */}
      <div
        className="sidebar-resize-handle"
        onMouseDown={handleResizeStart}
        aria-label="サイドバー幅を変更"
      />

      {/* メインコンテンツ */}
      <main className="main-content">
        {!selectedProject ? (
          /* プロジェクト未選択 */
          <div className="welcome">
            <div className="welcome-inner">
              <h2 className="welcome-title">WBS Manager</h2>
              <p className="welcome-desc">プロジェクトを選択するか、新規作成してください。</p>
              <button className="welcome-btn" onClick={handleCreateProject}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                新規プロジェクト
              </button>
            </div>
          </div>
        ) : currentPage === 'project-overview' ? (
          /* プロジェクト概要 */
          <ProjectOverview
            project={selectedProject}
            allProjects={projects}
            onUpdate={updateProject}
            onDelete={handleDeleteProject}
            onGenerateWBS={handleGenerateWBS}
            onNavigateToWBS={() => setCurrentPage('wbs')}
          />
        ) : currentPage === 'wbs' ? (
          <div className="wbs-view">
            {/* ヘッダー */}
            <div className="wbs-header">
              <div>
                <span className="wbs-project-code">{selectedProject.projectCode}</span>
                <h2 className="wbs-project-name">{selectedProject.name || '無題のプロジェクト'}</h2>
              </div>
              <div className="wbs-stats">
                <span className="stat">
                  全タスク: <strong>{hierarchicalTasks.length}</strong>
                </span>
                <span className="stat">
                  進行中: <strong>{hierarchicalTasks.filter(t => t.status === '進行中').length}</strong>
                </span>
                <span className="stat">
                  完了: <strong>{hierarchicalTasks.filter(t => t.status === '完了').length}</strong>
                </span>
              </div>
            </div>

            {/* エラー表示 */}
            {wbsError && <div className="error-banner">⚠️ {wbsError}</div>}

            {/* ツールバー */}
            <Toolbar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onAddTask={handleAddTask}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              categories={categories}
            />

            {/* コンテンツ */}
            {wbsLoading ? (
              <div className="loading">
                <div className="loading-spinner" />
                <span>読み込み中...</span>
              </div>
            ) : viewMode === 'table' ? (
              <WBSTable
                tasks={filteredTasks}
                onUpdate={updateTask}
                onDelete={handleDelete}
                onAddSubTask={addSubTask}
              />
            ) : (
              <GanttChart tasks={filteredTasks} />
            )}
          </div>
        ) : currentPage === 'issues' ? (
          <IssueList
            issues={issues}
            onCreate={createIssue}
            onUpdate={updateIssue}
            onDelete={deleteIssue}
            fetchComments={fetchComments}
            addComment={addComment}
          />
        ) : currentPage === 'wiki' ? (
          <Wiki
            project={selectedProject}
            onUpdate={updateProject}
          />
        ) : null
        }
      </main >
    </div >
  );
}

export default App;
