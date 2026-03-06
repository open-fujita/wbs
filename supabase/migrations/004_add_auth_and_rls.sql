-- OAuth認証対応: projectsにuser_id追加、RLSポリシー更新
-- 注意: 既存のprojectsはuser_idがNULLのため、RLS適用後はアクセス不可になります。
-- 既存データを移行する場合、Supabase SQL Editorで以下を実行してください
-- （YOUR_USER_ID を auth.users の id に置き換え）:
--   UPDATE projects SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;

-- projectsにuser_id追加（auth.usersを参照）
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "projects_allow_all" ON projects;
DROP POLICY IF EXISTS "wbs_tasks_allow_all" ON wbs_tasks;
DROP POLICY IF EXISTS "issues_allow_all" ON issues;
DROP POLICY IF EXISTS "issue_comments_allow_all" ON issue_comments;

-- 認証済みユーザー: 自分のプロジェクトのみアクセス可能
CREATE POLICY "projects_user_access" ON projects
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 認証済みユーザー: 自分のプロジェクトのタスクのみ
CREATE POLICY "wbs_tasks_user_access" ON wbs_tasks
    FOR ALL
    USING (
        project_code IN (
            SELECT project_code FROM projects WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        project_code IN (
            SELECT project_code FROM projects WHERE user_id = auth.uid()
        )
    );

-- 認証済みユーザー: 自分のプロジェクトの課題のみ
CREATE POLICY "issues_user_access" ON issues
    FOR ALL
    USING (
        project_code IN (
            SELECT project_code FROM projects WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        project_code IN (
            SELECT project_code FROM projects WHERE user_id = auth.uid()
        )
    );

-- 認証済みユーザー: 自分のプロジェクトの課題コメントのみ
CREATE POLICY "issue_comments_user_access" ON issue_comments
    FOR ALL
    USING (
        issue_id IN (
            SELECT id FROM issues WHERE project_code IN (
                SELECT project_code FROM projects WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        issue_id IN (
            SELECT id FROM issues WHERE project_code IN (
                SELECT project_code FROM projects WHERE user_id = auth.uid()
            )
        )
    );
