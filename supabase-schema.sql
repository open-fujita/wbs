-- WBS Manager: Supabase 初期スキーマ
-- Supabase ダッシュボード > SQL Editor でこの内容を実行してください

-- プロジェクト
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    category TEXT DEFAULT '',
    purpose TEXT DEFAULT '',
    planned_start TEXT DEFAULT '',
    planned_end TEXT DEFAULT '',
    parent_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    wiki_content TEXT DEFAULT '',
    wiki_format TEXT DEFAULT 'text',
    mandala_data JSONB DEFAULT '{"center":"","cells":["","","","","","","",""]}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- WBSタスク
CREATE TABLE IF NOT EXISTS wbs_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_number INTEGER NOT NULL,
    category TEXT DEFAULT '',
    task_name TEXT DEFAULT '',
    parent_id UUID REFERENCES wbs_tasks(id) ON DELETE SET NULL,
    depth INTEGER DEFAULT 0,
    assignee TEXT DEFAULT '',
    status TEXT DEFAULT '未着手',
    planned_start TEXT DEFAULT '',
    planned_end TEXT DEFAULT '',
    actual_start TEXT DEFAULT '',
    actual_end TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    project_code TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 課題
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code TEXT DEFAULT '',
    title TEXT DEFAULT '',
    description TEXT DEFAULT '',
    priority TEXT DEFAULT '中',
    status TEXT DEFAULT '未対応',
    assignee TEXT DEFAULT '',
    due_date TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 課題コメント
CREATE TABLE IF NOT EXISTS issue_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    user_name TEXT DEFAULT 'ユーザー',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- anonロールにテーブルアクセス権限を付与
GRANT ALL ON projects TO anon;
GRANT ALL ON wbs_tasks TO anon;
GRANT ALL ON issues TO anon;
GRANT ALL ON issue_comments TO anon;

-- RLS有効化
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE wbs_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;

-- 全テーブルでanonによる全操作を許可
CREATE POLICY "projects_allow_all" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "wbs_tasks_allow_all" ON wbs_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "issues_allow_all" ON issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "issue_comments_allow_all" ON issue_comments FOR ALL USING (true) WITH CHECK (true);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER wbs_tasks_updated_at
    BEFORE UPDATE ON wbs_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER issues_updated_at
    BEFORE UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- チェックリスト
CREATE TABLE IF NOT EXISTS checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- チェックリスト項目
CREATE TABLE IF NOT EXISTS checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    is_completed BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- チェックリストテンプレート
CREATE TABLE IF NOT EXISTS checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'カスタム',
    items JSONB DEFAULT '[]'::jsonb,
    is_builtin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT ALL ON checklists TO anon;
GRANT ALL ON checklist_items TO anon;
GRANT ALL ON checklist_templates TO anon;

ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklists_allow_all" ON checklists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "checklist_items_allow_all" ON checklist_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "checklist_templates_allow_all" ON checklist_templates FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER checklists_updated_at
    BEFORE UPDATE ON checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER checklist_items_updated_at
    BEFORE UPDATE ON checklist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER checklist_templates_updated_at
    BEFORE UPDATE ON checklist_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
