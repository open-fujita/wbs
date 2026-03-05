import express from 'express';
import cors from 'cors';
import tasksRouter from './routes/tasks';
import projectsRouter from './routes/projects';
import issuesRouter from './routes/issues';
import { closeDatabase } from './db';

const app = express();
const PORT = 3001;

// ミドルウェア設定
app.use(cors());
app.use(express.json());

// APIルーティング
app.use('/api/tasks', tasksRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/issues', issuesRouter);

// ヘルスチェック
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`🚀 WBS APIサーバーが起動しました: http://localhost:${PORT}`);
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
    console.log('\n📦 データベースを閉じています...');
    closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    closeDatabase();
    process.exit(0);
});
