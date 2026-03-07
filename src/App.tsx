import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useWBSData } from './hooks/useWBSData';
import { useProjects } from './hooks/useProjects';
import { useIssues } from './hooks/useIssues';
import { useChecklists } from './hooks/useChecklists';
import { WBSTable } from './components/WBSTable';
import { GanttChart } from './components/GanttChart';
import { MandalaChart } from './components/MandalaChart';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { ProjectOverview } from './components/ProjectOverview';
import { IssueList } from './components/IssueList';
import { ChecklistView } from './components/ChecklistView';
import { Wiki } from './components/Wiki';
import type { ViewMode, PageType } from './types';
import './App.css';

/**
 * WBS管理アプリケーション メインコンポーネント
 * V0ライクなサイドバー + メインコンテンツのレイアウト
 */
function App() {
  const { user, loading: authLoading, signInWithGoogle, signInWithGithub, signOut } = useAuth();
  const {
    projects, loading: projectsLoading, error: projectsError,
    createProject, updateProject, deleteProject, generateWBS, fetchProjects,
  } = useProjects();

  // 選択中のプロジェクト
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<PageType>('project-overview');

  // 選択中のチェックリスト（プロジェクトとは独立）
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find(p => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  // 選択プロジェクトのWBSデータ
  const {
    hierarchicalTasks, loading: wbsLoading, error: wbsError,
    addTask, updateTask, deleteTask, addSubTask, reorderTasks, fetchTasks,
  } = useWBSData(selectedProject?.projectCode);

  // 選択プロジェクトの課題データ
  const {
    issues, createIssue, updateIssue, deleteIssue,
    fetchComments, addComment
  } = useIssues(selectedProject?.projectCode);

  // チェックリストデータ（プロジェクト非依存）
  const {
    checklists, items: checklistItems, templates: checklistTemplates,
    createChecklist, updateChecklist, deleteChecklist,
    addItem: addChecklistItem, updateItem: updateChecklistItem,
    deleteItem: deleteChecklistItem, toggleItem: toggleChecklistItem,
    reorderItems: reorderChecklistItems,
    saveAsTemplate, deleteTemplate,
  } = useChecklists();

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

  // サイドパネルの格納状態
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('wbs-sidebar-collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('wbs-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

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

  // 選択中のチェックリスト
  const selectedChecklist = useMemo(
    () => checklists.find(c => c.id === selectedChecklistId) || null,
    [checklists, selectedChecklistId]
  );

  // 新規プロジェクト作成
  const handleCreateProject = async () => {
    const project = await createProject({ name: '', purpose: '' });
    if (project) {
      setSelectedProjectId(project.id);
      setSelectedChecklistId(null);
      setCurrentPage('project-overview');
    } else {
      console.error('プロジェクト作成失敗:', projectsError);
    }
  };

  // プロジェクト選択（チェックリスト選択をクリア）
  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setSelectedChecklistId(null);
    setStatusFilter('');
    setCategoryFilter('');
  };

  // チェックリスト選択（プロジェクト選択をクリア）
  const handleSelectChecklist = (id: string) => {
    setSelectedChecklistId(id);
    setSelectedProjectId(null);
  };

  // 新規チェックリスト作成
  const handleCreateChecklist = async (parentId: string | null = null) => {
    const checklist = await createChecklist('新規チェックリスト', parentId);
    if (checklist) {
      setSelectedChecklistId(checklist.id);
      setSelectedProjectId(null);
    }
  };

  // チェックリスト削除
  const handleDeleteChecklist = async (id: string) => {
    await deleteChecklist(id);
    if (selectedChecklistId === id) {
      setSelectedChecklistId(null);
    }
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

  if (authLoading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="loading-spinner" />
        <span>読み込み中...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <Login
        onSignInWithGoogle={signInWithGoogle}
        onSignInWithGithub={signInWithGithub}
      />
    );
  }

  // メインコンテンツの描画
  const renderMainContent = () => {
    // チェックリストが選択されている場合
    if (selectedChecklist) {
      return (
        <ChecklistView
          checklist={selectedChecklist}
          items={checklistItems[selectedChecklist.id] || []}
          templates={checklistTemplates}
          allChecklists={checklists}
          onUpdateChecklist={updateChecklist}
          onDeleteChecklist={handleDeleteChecklist}
          onAddItem={addChecklistItem}
          onUpdateItem={updateChecklistItem}
          onDeleteItem={deleteChecklistItem}
          onToggleItem={toggleChecklistItem}
          onReorderItems={reorderChecklistItems}
          onSaveAsTemplate={saveAsTemplate}
          onDeleteTemplate={deleteTemplate}
        />
      );
    }

    // プロジェクトが選択されていない場合
    if (!selectedProject) {
      return (
        <div className="welcome">
          <div className="welcome-inner">
            <h2 className="welcome-title">OPEN Work Manager</h2>
            <p className="welcome-desc">プロジェクトを選択するか、新規作成してください。</p>
            <button
              className="welcome-btn"
              onClick={handleCreateProject}
              disabled={projectsLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新規プロジェクト
            </button>
          </div>
        </div>
      );
    }

    // プロジェクトのサブページ
    if (currentPage === 'project-overview') {
      return (
        <ProjectOverview
          project={selectedProject}
          allProjects={projects}
          onUpdate={updateProject}
          onDelete={handleDeleteProject}
          onGenerateWBS={handleGenerateWBS}
          onNavigateToWBS={() => setCurrentPage('wbs')}
        />
      );
    }

    if (currentPage === 'wbs') {
      return (
        <div className="wbs-view">
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

          {wbsError && <div className="error-banner">{wbsError}</div>}

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
              onReorder={reorderTasks}
            />
          ) : (
            <GanttChart tasks={filteredTasks} />
          )}
        </div>
      );
    }

    if (currentPage === 'issues') {
      return (
        <IssueList
          issues={issues}
          onCreate={createIssue}
          onUpdate={updateIssue}
          onDelete={deleteIssue}
          fetchComments={fetchComments}
          addComment={addComment}
        />
      );
    }

    if (currentPage === 'wiki') {
      return (
        <Wiki
          project={selectedProject}
          onUpdate={updateProject}
          onSaveSuccess={fetchProjects}
        />
      );
    }

    if (currentPage === 'mandala') {
      return <MandalaChart project={selectedProject} onUpdate={updateProject} />;
    }

    return null;
  };

  return (
    <div className="app-layout">
      {/* プロジェクトビュー（サイドバー） */}
      <div
        className={`sidebar-wrapper ${sidebarCollapsed ? 'collapsed' : ''}`}
        style={
          sidebarCollapsed
            ? { width: 48, minWidth: 48, maxWidth: 48 }
            : { width: sidebarWidth, minWidth: SIDEBAR_MIN, maxWidth: SIDEBAR_MAX }
        }
      >
        <Sidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          currentPage={currentPage}
          onSelectProject={handleSelectProject}
          onChangePage={setCurrentPage}
          onCreateProject={handleCreateProject}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
          user={user}
          onSignOut={signOut}
          checklists={checklists}
          checklistItems={checklistItems}
          selectedChecklistId={selectedChecklistId}
          onSelectChecklist={handleSelectChecklist}
          onCreateChecklist={handleCreateChecklist}
        />
      </div>

      {/* リサイズハンドル（格納時は非表示） */}
      {!sidebarCollapsed && (
        <div
          className="sidebar-resize-handle"
          onMouseDown={handleResizeStart}
          aria-label="サイドバー幅を変更"
        />
      )}

      {/* メインコンテンツ */}
      <main className="main-content">
        {projectsError && (
          <div className="error-banner" style={{ margin: '16px 32px' }}>
            {projectsError}
          </div>
        )}
        {renderMainContent()}
      </main>
    </div>
  );
}

export default App;
