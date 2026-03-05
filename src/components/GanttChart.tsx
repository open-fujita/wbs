import React, { useMemo } from 'react';
import type { WBSTask } from '../types';
import { STATUS_COLORS } from '../types';
import './GanttChart.css';

interface GanttChartProps {
    tasks: WBSTask[];
}

/**
 * ガントチャートコンポーネント
 * タスクの予定・実績期間を横棒グラフで可視化
 * 並行して走るタスクが一目でわかる
 */
export const GanttChart: React.FC<GanttChartProps> = ({ tasks }) => {
    // 日付範囲を計算
    const { startDate, totalDays, months } = useMemo(() => {
        const dates: Date[] = [];

        tasks.forEach((t) => {
            if (t.plannedStart) dates.push(new Date(t.plannedStart));
            if (t.plannedEnd) dates.push(new Date(t.plannedEnd));
            if (t.actualStart) dates.push(new Date(t.actualStart));
            if (t.actualEnd) dates.push(new Date(t.actualEnd));
        });

        if (dates.length === 0) {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
            return {
                startDate: start,
                endDate: end,
                totalDays: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
                months: getMonthsBetween(start, end),
            };
        }

        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

        // 前後に余白を追加（7日ずつ）
        const start = new Date(minDate);
        start.setDate(start.getDate() - 7);
        const end = new Date(maxDate);
        end.setDate(end.getDate() + 7);

        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        return {
            startDate: start,
            endDate: end,
            totalDays: Math.max(totalDays, 30),
            months: getMonthsBetween(start, end),
        };
    }, [tasks]);

    // 日付からバーの位置（%）を計算
    const getPosition = (dateStr: string): number => {
        if (!dateStr) return -1;
        const date = new Date(dateStr);
        const diff = (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        return (diff / totalDays) * 100;
    };

    // バーの幅（%）を計算
    const getWidth = (startStr: string, endStr: string): number => {
        if (!startStr || !endStr) return 0;
        const start = new Date(startStr);
        const end = new Date(endStr);
        const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        return Math.max((diff / totalDays) * 100, 0.5); // 最低幅
    };

    // 今日の位置
    const todayPos = getPosition(new Date().toISOString().split('T')[0]);

    // 日付があるタスクのみ表示
    const displayTasks = tasks.filter(
        (t) => t.plannedStart || t.plannedEnd || t.actualStart || t.actualEnd
    );

    if (displayTasks.length === 0) {
        return (
            <div className="gantt-empty">
                <div className="empty-icon">📊</div>
                <p className="empty-text">日付が設定されたタスクがありません</p>
                <p className="empty-hint">タスクに予定開始日・終了日を設定するとガントチャートが表示されます</p>
            </div>
        );
    }

    return (
        <div className="gantt-container">
            {/* 月ヘッダー */}
            <div className="gantt-header">
                <div className="gantt-label-col">タスク</div>
                <div className="gantt-timeline-col">
                    <div className="gantt-months">
                        {months.map((m, i) => (
                            <div
                                key={i}
                                className="gantt-month"
                                style={{ left: `${m.startPercent}%`, width: `${m.widthPercent}%` }}
                            >
                                {m.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* タスク行 */}
            <div className="gantt-body">
                {displayTasks.map((task) => {
                    const colors = STATUS_COLORS[task.status];
                    const plannedLeft = getPosition(task.plannedStart);
                    const plannedWidth = getWidth(task.plannedStart, task.plannedEnd);
                    const actualLeft = getPosition(task.actualStart);
                    const actualWidth = getWidth(task.actualStart, task.actualEnd);

                    return (
                        <div key={task.id} className={`gantt-row depth-${task.depth}`}>
                            {/* タスク名列 */}
                            <div className="gantt-label-col">
                                <span
                                    className="gantt-task-name"
                                    style={{ paddingLeft: `${task.depth * 16}px` }}
                                >
                                    {task.depth > 0 && <span className="gantt-indent">└</span>}
                                    {task.taskName || '（無題）'}
                                </span>
                                <span
                                    className="gantt-task-status"
                                    style={{ color: colors.text, backgroundColor: colors.bg }}
                                >
                                    {task.status}
                                </span>
                            </div>

                            {/* タイムライン列 */}
                            <div className="gantt-timeline-col">
                                <div className="gantt-bars">
                                    {/* 今日の線 */}
                                    {todayPos >= 0 && todayPos <= 100 && (
                                        <div className="gantt-today" style={{ left: `${todayPos}%` }} />
                                    )}

                                    {/* 予定バー */}
                                    {plannedWidth > 0 && (
                                        <div
                                            className="gantt-bar gantt-bar-planned"
                                            style={{
                                                left: `${plannedLeft}%`,
                                                width: `${plannedWidth}%`,
                                            }}
                                            title={`予定: ${task.plannedStart} 〜 ${task.plannedEnd}`}
                                        />
                                    )}

                                    {/* 実績バー */}
                                    {actualWidth > 0 && (
                                        <div
                                            className="gantt-bar gantt-bar-actual"
                                            style={{
                                                left: `${actualLeft}%`,
                                                width: `${actualWidth}%`,
                                            }}
                                            title={`実績: ${task.actualStart} 〜 ${task.actualEnd}`}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 凡例 */}
            <div className="gantt-legend">
                <span className="legend-item">
                    <span className="legend-bar legend-planned" />
                    予定
                </span>
                <span className="legend-item">
                    <span className="legend-bar legend-actual" />
                    実績
                </span>
                <span className="legend-item">
                    <span className="legend-line" />
                    今日
                </span>
            </div>
        </div>
    );
};

// 月ラベル情報を取得
interface MonthInfo {
    label: string;
    startPercent: number;
    widthPercent: number;
}

function getMonthsBetween(start: Date, end: Date): MonthInfo[] {
    const totalMs = end.getTime() - start.getTime();
    const months: MonthInfo[] = [];

    const current = new Date(start.getFullYear(), start.getMonth(), 1);

    while (current <= end) {
        const monthStart = new Date(Math.max(current.getTime(), start.getTime()));
        const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        const monthEnd = new Date(Math.min(nextMonth.getTime(), end.getTime()));

        const startPercent = ((monthStart.getTime() - start.getTime()) / totalMs) * 100;
        const widthPercent = ((monthEnd.getTime() - monthStart.getTime()) / totalMs) * 100;

        months.push({
            label: `${current.getFullYear()}/${current.getMonth() + 1}月`,
            startPercent,
            widthPercent,
        });

        current.setMonth(current.getMonth() + 1);
    }

    return months;
}
