# WBS Manager システム仕様書

**ドキュメントバージョン:** 1.0
**最終更新日:** 2026年3月7日
**プロジェクト:** WBS Manager
**リポジトリブランチ:** feature/kanban-and-project-hierarchy

---

## 目次

1. [システム概要](#1-システム概要)
2. [技術スタック](#2-技術スタック)
3. [プロジェクト構成](#3-プロジェクト構成)
4. [データベース設計](#4-データベース設計)
5. [認証・認可](#5-認証認可)
6. [画面構成・ナビゲーション](#6-画面構成ナビゲーション)
7. [機能仕様](#7-機能仕様)
8. [状態管理](#8-状態管理)
9. [外部API連携](#9-外部api連携)
10. [スタイル・デザインシステム](#10-スタイルデザインシステム)
11. [ビルド・デプロイ](#11-ビルドデプロイ)
12. [セキュリティ](#12-セキュリティ)
13. [パフォーマンス](#13-パフォーマンス)
14. [既知の制約と今後の展望](#14-既知の制約と今後の展望)

---

## 1. システム概要

### 1.1 目的

WBS Managerは、プロジェクトの計画・タスク管理・課題追跡を行うWebベースのプロジェクト管理アプリケーションである。WBS（Work Breakdown Structure）を中心に、ガントチャート、カンバンボード、マンダラチャートなど多角的なビジュアライゼーションを提供する。

### 1.2 主要機能一覧

| 機能 | 概要 |
|------|------|
| WBSテーブル | 階層的なタスク分解、インライン編集、ドラッグ&ドロップ並び替え |
| ガントチャート | 予定・実績のタイムライン可視化 |
| カンバンボード | 課題の3列ステータス管理（未対応/対応中/完了） |
| マンダラチャート | 3x3グリッドによる目標設定、AI自動生成 |
| Wiki | プロジェクトドキュメント（テキスト/Markdown対応） |
| プロジェクト階層 | 親子関係によるプロジェクト構造化 |
| WBS自動生成 | カテゴリ別テンプレートによるタスク自動作成 |
| OAuth認証 | Google/GitHubによるソーシャルログイン |

### 1.3 システム構成図

```
┌─────────────────────────────────────────────────────┐
│                   ブラウザ (SPA)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ WBSTable │ │  Gantt   │ │  Kanban  │ │Mandala │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
│       └──────┬──────┴──────┬─────┘           │      │
│         Custom Hooks (useWBSData, useIssues, etc.)   │
│              │             │                 │      │
│         Supabase JS SDK          OpenAI API Client   │
└──────────────┼─────────────┼─────────────────┼──────┘
               │             │                 │
        ┌──────▼─────────────▼──────┐   ┌─────▼──────┐
        │     Supabase Cloud        │   │  OpenAI    │
        │  ┌──────────┐ ┌────────┐  │   │  API       │
        │  │PostgreSQL │ │  Auth  │  │   └────────────┘
        │  │  (RLS)   │ │(OAuth) │  │
        │  └──────────┘ └────────┘  │
        └───────────────────────────┘
```

---

## 2. 技術スタック

### 2.1 フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| React | 19.2.0 | UIフレームワーク |
| TypeScript | 5.9.3 | 型安全な開発 |
| Vite | 7.3.1 | ビルドツール・開発サーバー |
| @dnd-kit/core | 6.3.1 | ドラッグ&ドロップ |
| @dnd-kit/sortable | 10.0.0 | ソータブルリスト |
| react-markdown | 10.1.0 | Markdownレンダリング |
| @supabase/supabase-js | 2.98.0 | Supabaseクライアント |

### 2.2 バックエンド

| 技術 | 用途 |
|------|------|
| Supabase (PostgreSQL) | データベース・認証・RLS |
| OpenAI API (gpt-4o-mini) | マンダラチャートAI生成 |

### 2.3 レガシー（未使用）

| 技術 | 用途 |
|------|------|
| Express.js | 旧バックエンドサーバー（server/） |
| better-sqlite3 | 旧ローカルDB（wbs.db） |

### 2.4 開発ツール

| 技術 | 用途 |
|------|------|
| ESLint | コードリンティング |
| tsx | TypeScriptスクリプト実行 |
| @vitejs/plugin-react | React Fast Refresh |

---

## 3. プロジェクト構成

```
wbs/
├── src/                          # フロントエンドソース
│   ├── components/               # UIコンポーネント
│   │   ├── WBSTable.tsx         # WBSメインテーブル（階層タスク、DnD、折りたたみ）
│   │   ├── TaskRow.tsx          # タスク行（インライン編集）
│   │   ├── GanttChart.tsx       # ガントチャート（予定/実績バー）
│   │   ├── MandalaChart.tsx     # マンダラチャート（3x3グリッド、AI生成）
│   │   ├── IssueList.tsx        # カンバンボード（課題管理）
│   │   ├── IssueDetailModal.tsx # 課題詳細モーダル（コメント機能）
│   │   ├── ProjectOverview.tsx  # プロジェクト概要編集
│   │   ├── Wiki.tsx             # Wiki（テキスト/Markdown）
│   │   ├── Sidebar.tsx          # サイドバー（プロジェクトツリー）
│   │   ├── Toolbar.tsx          # フィルタ・ビュー切替
│   │   ├── Login.tsx            # OAuthログイン画面
│   │   ├── StatusBadge.tsx      # ステータスバッジ
│   │   └── *.css                # コンポーネントスタイル
│   ├── hooks/                    # カスタムフック
│   │   ├── useAuth.ts           # OAuth認証状態管理
│   │   ├── useProjects.ts       # プロジェクトCRUD・WBS生成
│   │   ├── useWBSData.ts        # WBSタスクCRUD・並び替え・階層構築
│   │   └── useIssues.ts         # 課題CRUD・コメント
│   ├── lib/                      # ユーティリティ
│   │   ├── supabase.ts          # Supabaseクライアント初期化
│   │   ├── dbMappers.ts         # snake_case ↔ camelCase 変換
│   │   ├── wbsTemplates.ts      # WBS自動生成テンプレート（5カテゴリ）
│   │   └── aiGenerate.ts        # OpenAI API連携
│   ├── types.ts                  # TypeScript型定義・列挙
│   ├── App.tsx                   # メインレイアウト
│   ├── App.css / index.css       # グローバルスタイル
│   └── main.tsx                  # エントリーポイント
├── server/                       # レガシーバックエンド（未使用）
│   ├── index.ts                  # Express サーバー (port 3001)
│   ├── db.ts                     # SQLite接続・スキーマ
│   └── routes/                   # REST APIルート
├── supabase/                     # Supabase設定・マイグレーション
├── scripts/
│   └── import-sqlite-to-supabase.ts  # データ移行スクリプト
├── public/                       # 静的アセット
├── docs/                         # ドキュメント
├── vite.config.ts                # Vite設定
├── tsconfig.*.json               # TypeScript設定
├── supabase-schema.sql           # データベーススキーマ定義
├── .env.example                  # 環境変数テンプレート
└── start.ps1 / stop.ps1 / status.ps1  # PowerShell管理スクリプト
```

---

## 4. データベース設計

### 4.1 ER図

```
┌─────────────┐       ┌─────────────┐
│  projects   │1    N │  wbs_tasks  │
│─────────────│───────│─────────────│
│ id (PK)     │       │ id (PK)     │
│ project_code│◄──────│ project_code│
│ name        │       │ task_name   │
│ category    │       │ parent_id   │──┐ (自己参照)
│ parent_id   │──┐    │ depth       │  │
│ user_id     │  │    │ status      │  │
│ wiki_content│  │    │ sort_order  │◄─┘
│ mandala_data│  │    │ ...         │
│ ...         │  │    └─────────────┘
└─────────────┘  │
     │ (自己参照)│    ┌─────────────┐       ┌────────────────┐
     └───────────┘    │   issues    │1    N │ issue_comments │
                      │─────────────│───────│────────────────│
                      │ id (PK)     │       │ id (PK)        │
                      │ project_code│       │ issue_id (FK)  │
                      │ title       │       │ content        │
                      │ status      │       │ user_name      │
                      │ priority    │       │ created_at     │
                      │ ...         │       └────────────────┘
                      └─────────────┘
```

### 4.2 テーブル定義

#### projects（プロジェクト）

| カラム | 型 | デフォルト | 説明 |
|--------|------|-----------|------|
| id | UUID | gen_random_uuid() | 主キー |
| project_code | TEXT (UNIQUE) | - | プロジェクトコード（例: PRJ-001） |
| name | TEXT | '' | プロジェクト名 |
| category | TEXT | '' | カテゴリ（システム企画/システム導入/新規事業企画/トラブル対応/その他） |
| purpose | TEXT | '' | 目的・概要 |
| planned_start | TEXT | '' | 予定開始日（ISO日付文字列） |
| planned_end | TEXT | '' | 予定終了日（ISO日付文字列） |
| parent_id | UUID (FK) | NULL | 親プロジェクトID |
| user_id | UUID (FK) | - | 所有ユーザーID（auth.users参照） |
| wiki_content | TEXT | '' | Wikiコンテンツ |
| wiki_format | TEXT | 'text' | Wikiフォーマット（'text' \| 'markdown'） |
| mandala_data | JSONB | {} | マンダラチャートデータ |
| created_at | TIMESTAMPTZ | now() | 作成日時 |
| updated_at | TIMESTAMPTZ | now() | 更新日時 |

#### wbs_tasks（WBSタスク）

| カラム | 型 | デフォルト | 説明 |
|--------|------|-----------|------|
| id | UUID | gen_random_uuid() | 主キー |
| item_number | INTEGER | - | 表示番号（プロジェクト内連番） |
| category | TEXT | '' | カテゴリ |
| task_name | TEXT | '' | タスク名 |
| parent_id | UUID (FK) | NULL | 親タスクID（自己参照） |
| depth | INTEGER | 0 | 階層の深さ（0=ルート） |
| assignee | TEXT | '' | 担当者 |
| status | TEXT | '未着手' | ステータス |
| planned_start | TEXT | '' | 予定開始日 |
| planned_end | TEXT | '' | 予定終了日 |
| actual_start | TEXT | '' | 実績開始日 |
| actual_end | TEXT | '' | 実績終了日 |
| notes | TEXT | '' | 備考 |
| sort_order | INTEGER | 0 | 並び順（DnD用） |
| project_code | TEXT | '' | 所属プロジェクトコード |
| created_at | TIMESTAMPTZ | now() | 作成日時 |
| updated_at | TIMESTAMPTZ | now() | 更新日時 |

**ステータス値:**

| 値 | 意味 | 色 |
|----|------|-----|
| 未着手 | まだ開始していない | スレートグレー |
| 進行中 | 作業中 | ブルー |
| 完了 | 完了済み | グリーン |
| 中断 | 一時中断 | アンバー |
| 取消 | キャンセル | レッド |

#### issues（課題）

| カラム | 型 | デフォルト | 説明 |
|--------|------|-----------|------|
| id | UUID | gen_random_uuid() | 主キー |
| project_code | TEXT | '' | 所属プロジェクトコード |
| title | TEXT | '' | 課題タイトル |
| description | TEXT | '' | 詳細説明 |
| priority | TEXT | '中' | 優先度（'高' \| '中' \| '低'） |
| status | TEXT | '未対応' | ステータス（'未対応' \| '対応中' \| '完了'） |
| assignee | TEXT | '' | 担当者 |
| due_date | TEXT | '' | 期限 |
| created_at | TIMESTAMPTZ | now() | 作成日時 |
| updated_at | TIMESTAMPTZ | now() | 更新日時 |

#### issue_comments（課題コメント）

| カラム | 型 | デフォルト | 説明 |
|--------|------|-----------|------|
| id | UUID | gen_random_uuid() | 主キー |
| issue_id | UUID (FK) | - | 課題ID（CASCADE削除） |
| content | TEXT | - | コメント内容 |
| user_name | TEXT | 'ユーザー' | 投稿者名 |
| created_at | TIMESTAMPTZ | now() | 作成日時 |

### 4.3 トリガー・関数

- **update_updated_at()**: 行更新時に`updated_at`を自動更新するトリガー関数
- projects、wbs_tasks、issuesテーブルに設定

### 4.4 型変換

- データベース: `snake_case`（SQL標準）
- フロントエンド: `camelCase`（JavaScript標準）
- `dbMappers.ts`の`toCamelCase()` / `toSnakeCase()`で相互変換

---

## 5. 認証・認可

### 5.1 認証方式

OAuth 2.0によるソーシャルログイン（Supabase Auth経由）

**対応プロバイダ:**
- Google（Google Cloud Console OAuth 2.0）
- GitHub（GitHub Developer Settings OAuth 2.0）

### 5.2 認証フロー

```
1. ユーザーがログインボタンをクリック
   │
2. supabase.auth.signInWithOAuth({ provider }) 呼び出し
   │
3. プロバイダのログイン画面にリダイレクト
   │
4. ユーザーが認証・認可
   │
5. コールバックURLにリダイレクト (http://localhost:5173/**)
   │
6. Supabaseがセッショントークンを発行
   │
7. useAuth フックがセッション状態を更新
   │
8. RLSポリシーがuser_idに基づきデータアクセスを制御
```

### 5.3 セッション管理

- `useAuth.ts`が`onAuthStateChange`を購読し、セッションの自動更新を実行
- セッションはブラウザのlocalStorageにSupabase JS SDKが自動保存
- `signOut()`でセッション破棄

### 5.4 RLS（行レベルセキュリティ）

- projectsテーブル: `user_id`によるユーザー単位のアクセス制御
- 他ユーザーのデータは参照・更新不可

### 5.5 ユーザー情報

| プロパティ | 説明 |
|-----------|------|
| user.id | UUID（Supabase内部ID） |
| user.email | OAuthメールアドレス |
| user.user_metadata | プロバイダ固有情報（名前、アバター等） |

---

## 6. 画面構成・ナビゲーション

### 6.1 ルーティング方式

- SPAアプリケーション（React Router未使用）
- `App.tsx`の`currentPage`ステートによるページ切り替え
- サイドバーのボタンクリックで`setCurrentPage()`を呼び出し

### 6.2 ページ一覧

| ページID | コンポーネント | 機能 |
|----------|--------------|------|
| `project-overview` | ProjectOverview | プロジェクトメタデータ編集、WBS生成 |
| `wbs` | WBSTable + GanttChart | タスク分解 + ビジュアライゼーション |
| `issues` | IssueList | カンバンボード（課題管理） |
| `wiki` | Wiki | プロジェクトドキュメント |
| `mandala` | MandalaChart | 目標設定ビジュアライゼーション |

### 6.3 画面レイアウト

```
┌───────────────────────────────────────────────────┐
│                    ヘッダー                         │
├──────────┬────────────────────────────────────────┤
│          │  ツールバー（フィルタ・ビュー切替）        │
│          ├────────────────────────────────────────┤
│ サイド   │                                        │
│ バー     │         メインコンテンツ                  │
│          │   (WBSTable / GanttChart / IssueList   │
│ プロジェ │    / Wiki / MandalaChart /              │
│ クト     │    ProjectOverview)                     │
│ ツリー   │                                        │
│          │                                        │
│ ◄─ 幅   │                                        │
│ リサイズ │                                        │
│ 可能 ─►  │                                        │
├──────────┴────────────────────────────────────────┤
│                   フッター                          │
└───────────────────────────────────────────────────┘
```

- サイドバー幅はドラッグでリサイズ可能（localStorageに保存）
- サイドバーは折りたたみ可能

---

## 7. 機能仕様

### 7.1 WBSテーブル管理

**ファイル:** `src/components/WBSTable.tsx`, `src/components/TaskRow.tsx`

#### 機能詳細

| 機能 | 説明 |
|------|------|
| 階層タスク | 親子関係によるツリー構造、depthによるインデント表示 |
| インライン編集 | セルクリックで直接編集、Enterで保存 |
| ドラッグ&ドロップ | @dnd-kitによる同階層内の並び替え |
| 折りたたみ | 親タスクのトグルで子タスクの表示/非表示 |
| 列リサイズ | 列区切りのドラッグで幅変更（localStorageに保存） |
| ステータスカラー | 5種類のステータスに対応した色分け表示 |
| フィルタリング | ステータス別・カテゴリ別のドロップダウンフィルタ |
| サブタスク追加 | 親タスクの下に子タスクを追加 |

#### テーブル列

| 列名 | 編集可能 | 説明 |
|------|---------|------|
| No. | - | 自動採番 |
| カテゴリ | はい | タスクカテゴリ |
| タスク名 | はい | タスク名称 |
| 担当者 | はい | 担当者名 |
| ステータス | はい | ドロップダウン選択 |
| 予定開始日 | はい | 日付ピッカー |
| 予定終了日 | はい | 日付ピッカー |
| 実績開始日 | はい | 日付ピッカー |
| 実績終了日 | はい | 日付ピッカー |
| 備考 | はい | 自由テキスト |
| 操作 | - | 削除・サブタスク追加ボタン |

### 7.2 ガントチャート

**ファイル:** `src/components/GanttChart.tsx`

| 機能 | 説明 |
|------|------|
| デュアルタイムライン | 予定（青バー）と実績（緑バー）を並列表示 |
| 自動スケール | タスク日付範囲から表示期間を自動計算 |
| 月ヘッダー | 月単位でグルーピングされた列ヘッダー |
| 今日線 | 現在日付を示す赤色の縦線 |
| 空状態 | 日付未設定時のメッセージ表示 |

### 7.3 カンバンボード（課題管理）

**ファイル:** `src/components/IssueList.tsx`, `src/components/IssueDetailModal.tsx`

#### 3列レイアウト

| 列 | ステータス | 色 |
|----|----------|-----|
| 未対応 | 新規・未着手の課題 | グレー |
| 対応中 | 対応作業中の課題 | ブルー |
| 完了 | 解決済みの課題 | グリーン |

#### 課題カード表示項目
- タイトル
- 優先度バッジ（高:赤 / 中:黄 / 低:緑）
- 担当者
- 期限

#### 課題詳細モーダル
- 課題の全フィールド編集
- コメント一覧表示
- コメント追加（ユーザー名・タイムスタンプ付き）

### 7.4 プロジェクト階層

**ファイル:** `src/components/Sidebar.tsx`, `src/components/ProjectOverview.tsx`

| 機能 | 説明 |
|------|------|
| 親子関係 | プロジェクトに親プロジェクトを設定可能 |
| ツリー展開 | サイドバーで階層ツリーを展開/折りたたみ |
| 循環依存防止 | 子孫プロジェクトを親に設定不可 |
| カスケード更新 | プロジェクト削除時に子の参照を更新 |

### 7.5 Wiki

**ファイル:** `src/components/Wiki.tsx`

| 機能 | 説明 |
|------|------|
| デュアルフォーマット | テキスト / Markdown切替 |
| Markdownツールバー | 太字、斜体、見出し、リスト等のクイック挿入ボタン |
| ライブプレビュー | Markdownのレンダリングプレビュー表示 |
| 自動保存 | Supabaseの`projects.wiki_content`に保存 |

### 7.6 マンダラチャート

**ファイル:** `src/components/MandalaChart.tsx`, `src/lib/aiGenerate.ts`

| 機能 | 説明 |
|------|------|
| 3x3グリッド | 中央セル（メイン目標）+ 8つの周辺セル（サブ目標） |
| 8つの視点 | 要件、計画、スケジュール、品質、リソース、成果物、リスク、評価 |
| AI生成 | OpenAI APIによるサブ目標の自動生成 |
| ネスト構造 | 各外側セルに独自の3x3マンダラを設定可能 |
| JSONB保存 | `projects.mandala_data`にネスト構造で保存 |

### 7.7 WBS自動生成

**ファイル:** `src/lib/wbsTemplates.ts`

プロジェクトカテゴリに応じたテンプレートからWBSタスクを自動生成する。

#### テンプレート一覧

| カテゴリ | フェーズ |
|----------|---------|
| システム企画 | 現状分析 → 企画立案 → 提案 → 要件定義 |
| システム導入 | 要件定義 → 設計 → 開発/構築 → テスト → 移行 → 運用定着 |
| 新規事業企画 | 市場調査 → 事業計画 → 検証 → 準備 → 立ち上げ |
| トラブル対応 | 初動対応 → 原因調査 → 恒久対策 → 再発防止 → 報告 |
| その他 | 企画 → 設計 → 実行 → 検証 → 完了 |

#### 生成アルゴリズム

1. プロジェクトのカテゴリと期間を取得
2. カテゴリに対応するテンプレートを選択
3. `phaseWeights`に基づきプロジェクト期間をフェーズに按分
4. フェーズごとに親タスク1件 + サブタスク3件を作成
5. 重みに基づき開始日・終了日を計算
6. 全タスクをSupabaseに一括挿入

---

## 8. 状態管理

### 8.1 アーキテクチャ

React Hooks + カスタムフックによる状態管理（Redux/Context API未使用）

### 8.2 状態フロー

```
App.tsx (ルート)
├── useAuth()                    [user, session, signIn/Out]
├── useProjects()                [projects[], CRUD, generateWBS]
├── useWBSData(projectCode)      [tasks[], CRUD, reorder, 階層構築]
├── useIssues(projectCode)       [issues[], CRUD, comments]
└── ローカルステート:
    ├── selectedProjectId        # 選択中プロジェクト
    ├── currentPage              # 表示中ページ
    ├── viewMode                 # 'table' | 'gantt'
    ├── statusFilter             # ステータスフィルタ
    ├── categoryFilter           # カテゴリフィルタ
    ├── sidebarWidth             # サイドバー幅
    └── sidebarCollapsed         # サイドバー折りたたみ状態
```

### 8.3 カスタムフック詳細

#### useAuth.ts
| 返値 | 型 | 説明 |
|------|-----|------|
| user | User \| null | 認証ユーザー情報 |
| session | Session \| null | セッション情報 |
| loading | boolean | 認証状態読み込み中 |
| signInWithGoogle() | () => Promise | Googleログイン |
| signInWithGithub() | () => Promise | GitHubログイン |
| signOut() | () => Promise | ログアウト |

#### useProjects.ts
| 返値 | 型 | 説明 |
|------|-----|------|
| projects | Project[] | プロジェクト一覧 |
| createProject() | (data) => Promise | プロジェクト作成 |
| updateProject() | (id, data) => Promise | プロジェクト更新 |
| deleteProject() | (id) => Promise | プロジェクト削除 |
| generateWBS() | (projectCode) => Promise | WBS自動生成 |

#### useWBSData.ts
| 返値 | 型 | 説明 |
|------|-----|------|
| tasks | Task[] | フラットなタスク一覧 |
| hierarchicalTasks | Task[] | 階層構造タスク |
| addTask() | (data) => Promise | タスク追加 |
| updateTask() | (id, data) => Promise | タスク更新 |
| deleteTask() | (id) => Promise | タスク削除 |
| addSubTask() | (parentId) => Promise | サブタスク追加 |
| reorderTasks() | (tasks) => Promise | 並び替え |

#### useIssues.ts
| 返値 | 型 | 説明 |
|------|-----|------|
| issues | Issue[] | 課題一覧 |
| createIssue() | (data) => Promise | 課題作成 |
| updateIssue() | (id, data) => Promise | 課題更新 |
| deleteIssue() | (id) => Promise | 課題削除 |
| fetchComments() | (issueId) => Promise | コメント取得 |
| addComment() | (issueId, content) => Promise | コメント追加 |

### 8.4 データ永続化

- 全書き込みはSupabaseへ即時送信（バッチ処理なし）
- 楽観的更新: UIを即時更新後、サーバーで確認
- エラー時はトースト風メッセージで通知
- オフライン非対応

---

## 9. 外部API連携

### 9.1 Supabase（プライマリバックエンド）

**接続設定:** `src/lib/supabase.ts`

```typescript
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

**操作一覧:**

| リソース | 操作 |
|----------|------|
| `supabase.from('projects')` | SELECT, INSERT, UPDATE, DELETE |
| `supabase.from('wbs_tasks')` | SELECT, INSERT, UPDATE, DELETE |
| `supabase.from('issues')` | SELECT, INSERT, UPDATE, DELETE |
| `supabase.from('issue_comments')` | SELECT, INSERT, DELETE |
| `supabase.auth` | signInWithOAuth, getSession, onAuthStateChange, signOut |

### 9.2 OpenAI API（マンダラAI生成）

**ファイル:** `src/lib/aiGenerate.ts`

| 項目 | 値 |
|------|-----|
| エンドポイント | `https://api.openai.com/v1/chat/completions` |
| モデル | gpt-4o-mini |
| Temperature | 0.7 |
| 入力 | 中央目標テキスト（プロンプトエンジニアリング） |
| 出力 | JSON `{ cells: [goal1, ..., goal8] }` |
| エラー処理 | レスポンス形式バリデーション、フォールバックメッセージ |

---

## 10. スタイル・デザインシステム

### 10.1 デザインコンセプト

- V0ライクなミニマルデザイン
- 白背景、モノクロームアクセント
- カスタムCSS（CSSフレームワーク未使用）
- レスポンシブ対応（サイドバー/テーブル列のリサイズ）

### 10.2 カラーパレット

```css
--color-bg: #ffffff;                /* メイン背景 */
--color-border: #d4d4d4;            /* フォームボーダー */
--color-text: #171717;              /* プライマリテキスト */
--color-text-secondary: #737373;    /* セカンダリテキスト */
--color-cell-hover: #f5f5f5;        /* テーブルセルホバー */
--color-accent: #171717;            /* ボタン・リンク */
```

### 10.3 ステータスカラー

| ステータス | 背景色 | テキスト色 | ボーダー色 |
|-----------|--------|-----------|-----------|
| 未着手 | #f1f5f9 | #64748b | #cbd5e1 |
| 進行中 | #dbeafe | #2563eb | #93c5fd |
| 完了 | #dcfce7 | #16a34a | #86efac |
| 中断 | #fef3c7 | #d97706 | #fcd34d |
| 取消 | #fee2e2 | #dc2626 | #fca5a5 |

---

## 11. ビルド・デプロイ

### 11.1 NPMスクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動（port 5173） |
| `npm run build` | TypeScriptチェック + 本番ビルド（dist/） |
| `npm run lint` | ESLint実行 |
| `npm run preview` | 本番ビルドのローカルプレビュー |
| `npm run import:sqlite` | SQLite → Supabase データ移行 |

### 11.2 環境変数

```env
# Supabase接続
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# OpenAI API（マンダラチャートAI生成用）
VITE_OPENAI_API_KEY=sk-...
```

### 11.3 ビルド出力

- 出力先: `dist/`
- エントリーポイント: `dist/index.html`
- アセット: `dist/assets/`（ハッシュ付きファイル名でキャッシュ対応）

### 11.4 PowerShell管理スクリプト

| スクリプト | 説明 |
|-----------|------|
| `start.ps1` | バックエンド(3001) & フロントエンド(5173)起動 |
| `stop.ps1` | ポート番号でプロセス停止 |
| `status.ps1` | サービス稼働状況確認 |

---

## 12. セキュリティ

### 12.1 現在のセキュリティ対策

| 対策 | 説明 |
|------|------|
| OAuth認証 | Google/GitHubへの認証委譲 |
| RLS | 行レベルセキュリティによるuser_id単位のデータ隔離 |
| HTTPS | Supabase通信は常にSSL/TLS |
| Anon Key | クライアント用公開鍵（認証なしではユーザーデータアクセス不可） |

### 12.2 本番環境向け推奨事項

1. **RLS強化**: チーム/ワークスペースロールの追加
2. **APIレート制限**: Supabaseレート制限の有効化
3. **監査ログ**: データ変更の追跡
4. **CORS制限**: 本番ドメインのみ許可
5. **CSPヘッダー**: XSS防止のContent Security Policy追加
6. **OpenAI APIキー**: フロントエンド直接呼び出しを避け、バックエンドプロキシ経由にする
7. **定期バックアップ**: Supabase自動バックアップの有効化

---

## 13. パフォーマンス

### 13.1 指標

| 項目 | 値 |
|------|-----|
| 開発ビルド時間 | 約2-3秒（Vite） |
| 本番バンドルサイズ | 約200KB（gzip後、推定） |
| 初回ロード | 1秒未満（Vite SPA、キャッシュ有効時） |
| クエリレイテンシ | 100ms未満（Supabase、リージョン依存） |

### 13.2 最適化手法

| 手法 | 説明 |
|------|------|
| useMemo | 階層タスク構築等の高コスト計算のメモ化 |
| localStorage | サイドバー幅、列幅、ユーザー設定のキャッシュ |
| Vite HMR | 開発時のホットモジュールリプレースメント |

### 13.3 スケーラビリティ上の注意

- 1プロジェクトあたり5,000タスク超で階層ツリー構築が遅延する可能性
- ガントチャートは500タスク超の日付表示で描画遅延の可能性
- リアルタイム同期未対応（他セッションの更新にはページ再読込が必要）

---

## 14. 既知の制約と今後の展望

### 14.1 現在の制約

| 制約 | 説明 |
|------|------|
| リアルタイム同期なし | セッション間のデータ更新がブロードキャストされない |
| オフライン非対応 | Supabaseへのインターネット接続が必須 |
| エクスポート/インポートUI未実装 | プログラム的な移行スクリプトのみ |
| 権限管理が限定的 | ユーザー単位のRLSのみ（チーム/ロールベースなし） |
| コメント機能が基本的 | @メンション・書式設定未対応 |
| モバイル最適化なし | ブラウザのみ（レスポンシブだがモバイル最適化されていない） |

### 14.2 今後の拡張候補

- リアルタイムコラボレーション（Supabase Realtime / WebSocket）
- チーム/ワークスペース共有（ロールベースアクセス制御）
- PDF/Excelエクスポート
- 繰り返しタスク
- 工数管理・見積もり
- 外部連携（Google Calendar、Slack、Jira）
- モバイルアプリ（React Native）
- 高度なフィルタリング・保存ビュー
- カスタムフィールド
- Undo/Redo
- 通知/リマインダー

---

## 付録: ファイルパスリファレンス

### フロントエンドコンポーネント
| ファイル | 説明 |
|---------|------|
| `src/components/WBSTable.tsx` | WBSメインテーブル |
| `src/components/TaskRow.tsx` | タスク行コンポーネント |
| `src/components/GanttChart.tsx` | ガントチャート |
| `src/components/MandalaChart.tsx` | マンダラチャート |
| `src/components/IssueList.tsx` | カンバンボード |
| `src/components/IssueDetailModal.tsx` | 課題詳細モーダル |
| `src/components/ProjectOverview.tsx` | プロジェクト概要 |
| `src/components/Wiki.tsx` | Wiki |
| `src/components/Sidebar.tsx` | サイドバー |
| `src/components/Toolbar.tsx` | ツールバー |
| `src/components/Login.tsx` | ログイン画面 |
| `src/components/StatusBadge.tsx` | ステータスバッジ |

### カスタムフック
| ファイル | 説明 |
|---------|------|
| `src/hooks/useAuth.ts` | OAuth認証管理 |
| `src/hooks/useProjects.ts` | プロジェクトCRUD |
| `src/hooks/useWBSData.ts` | WBSタスク管理 |
| `src/hooks/useIssues.ts` | 課題管理 |

### ライブラリ
| ファイル | 説明 |
|---------|------|
| `src/lib/supabase.ts` | Supabaseクライアント初期化 |
| `src/lib/dbMappers.ts` | DB型変換ユーティリティ |
| `src/lib/wbsTemplates.ts` | WBS自動生成テンプレート |
| `src/lib/aiGenerate.ts` | OpenAI API連携 |

### 設定ファイル
| ファイル | 説明 |
|---------|------|
| `vite.config.ts` | Viteビルド設定 |
| `tsconfig.app.json` | TypeScript（フロントエンド） |
| `supabase-schema.sql` | データベーススキーマ |
| `.env.example` | 環境変数テンプレート |
| `eslint.config.js` | ESLint設定 |
