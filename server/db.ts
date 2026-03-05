import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュール環境でのディレクトリパス取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// データベースファイルのパス（プロジェクトルートに配置）
const DB_PATH = path.join(__dirname, '..', 'wbs.db');

// シングルトンでDB接続を管理
let db: Database.Database | null = null;

/**
 * データベース接続を取得する
 * 初回呼び出し時にテーブルを自動作成
 */
export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);

    // WALモードで高速化
    db.pragma('journal_mode = WAL');

    // テーブル作成（存在しない場合のみ）
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        project_code TEXT UNIQUE NOT NULL,
        name TEXT DEFAULT '',
        category TEXT DEFAULT '',
        purpose TEXT DEFAULT '',
        planned_start TEXT DEFAULT '',
        planned_end TEXT DEFAULT '',
        parent_id TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS wbs_tasks (
        id TEXT PRIMARY KEY,
        item_number INTEGER NOT NULL,
        category TEXT DEFAULT '',
        task_name TEXT DEFAULT '',
        parent_id TEXT,
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
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (parent_id) REFERENCES wbs_tasks(id) ON DELETE SET NULL
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS issues (
        id TEXT PRIMARY KEY,
        project_code TEXT DEFAULT '',
        title TEXT DEFAULT '',
        description TEXT DEFAULT '',
        priority TEXT DEFAULT '中',
        status TEXT DEFAULT '未対応',
        assignee TEXT DEFAULT '',
        due_date TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS issue_comments (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL,
        content TEXT NOT NULL,
        user_name TEXT DEFAULT 'ユーザー',
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
      )
    `);

    // 既存DBへのマイグレーション
    const safeAlter = (sql: string) => { try { db!.exec(sql); } catch { /* 既存列は無視 */ } };
    safeAlter("ALTER TABLE wbs_tasks ADD COLUMN project_code TEXT DEFAULT ''");
    safeAlter("ALTER TABLE projects ADD COLUMN category TEXT DEFAULT ''");
    safeAlter("ALTER TABLE projects ADD COLUMN parent_id TEXT DEFAULT ''");
    safeAlter("ALTER TABLE projects ADD COLUMN wiki_content TEXT DEFAULT ''");
    safeAlter("ALTER TABLE projects ADD COLUMN wiki_format TEXT DEFAULT 'text'");
  }

  return db;
}

/**
 * データベース接続を閉じる
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
