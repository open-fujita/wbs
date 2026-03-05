-- 既に001を実行済みの場合、このファイルのみ実行
-- 権限付与とポリシー名の修正

GRANT ALL ON projects TO anon;
GRANT ALL ON wbs_tasks TO anon;
GRANT ALL ON issues TO anon;
GRANT ALL ON issue_comments TO anon;

-- 既存ポリシーを削除して再作成（重複エラー回避）
DROP POLICY IF EXISTS "Allow all for anon" ON projects;
DROP POLICY IF EXISTS "Allow all for anon" ON wbs_tasks;
DROP POLICY IF EXISTS "Allow all for anon" ON issues;
DROP POLICY IF EXISTS "Allow all for anon" ON issue_comments;

CREATE POLICY "projects_allow_all" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "wbs_tasks_allow_all" ON wbs_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "issues_allow_all" ON issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "issue_comments_allow_all" ON issue_comments FOR ALL USING (true) WITH CHECK (true);
