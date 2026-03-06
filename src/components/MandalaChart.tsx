import React, { useState, useCallback } from 'react';
import type { Project, MandalaData } from '../types';
import { generateSubMandala } from '../lib/aiGenerate';
import './MandalaChart.css';

const DEFAULT_MANDALA: MandalaData = {
    center: '',
    cells: ['', '', '', '', '', '', '', ''],
};

const DEFAULT_LABELS = [
    '要件', '計画', 'スケジュール', '品質',
    'リソース', '成果物', 'リスク', '評価',
];

const EMPTY_SUB_MANDALAS: MandalaData['subMandalas'] = [
    null, null, null, null, null, null, null, null,
];

interface MandalaChartProps {
    project: Project;
    onUpdate: (id: string, updates: Partial<Project>) => Promise<unknown>;
}

/** 現在表示中のマンダラ（メイン or サブ） */
type ViewContext = { level: 'main' } | { level: 'sub'; cellIndex: number; cellLabel: string };

/**
 * マンダラチャートコンポーネント
 * 3x3グリッドでプロジェクトの目標・視点を整理。サブマンダラ対応。
 */
export const MandalaChart: React.FC<MandalaChartProps> = ({ project, onUpdate }) => {
    const rootData: MandalaData = project.mandalaData ?? DEFAULT_MANDALA;
    const [viewContext, setViewContext] = useState<ViewContext>({ level: 'main' });
    const [editingCell, setEditingCell] = useState<number | 'center' | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);

    const data: MandalaData = viewContext.level === 'main'
        ? rootData
        : (rootData.subMandalas?.[viewContext.cellIndex] ?? {
            center: rootData.cells[viewContext.cellIndex] || '',
            cells: ['', '', '', '', '', '', '', ''],
        });

    const handleStartEdit = useCallback((key: number | 'center', current: string) => {
        setEditingCell(key);
        setEditValue(current);
    }, []);

    const saveMandalaData = useCallback(async (newData: MandalaData) => {
        if (viewContext.level === 'main') {
            await onUpdate(project.id, { mandalaData: newData });
        } else {
            const base = rootData.subMandalas ?? EMPTY_SUB_MANDALAS;
            const subMandalas: MandalaData['subMandalas'] = [
                ...base.slice(0, viewContext.cellIndex),
                newData,
                ...base.slice(viewContext.cellIndex + 1),
            ] as MandalaData['subMandalas'];
            await onUpdate(project.id, {
                mandalaData: { ...rootData, subMandalas },
            });
        }
    }, [viewContext, rootData, project.id, onUpdate]);

    const handleSave = useCallback(async () => {
        if (editingCell === null) return;
        const next: MandalaData = { ...data };
        if (editingCell === 'center') {
            next.center = editValue.trim();
        } else {
            const cells = [...next.cells] as MandalaData['cells'];
            cells[editingCell] = editValue.trim();
            next.cells = cells;
        }
        await saveMandalaData(next);
        setEditingCell(null);
    }, [editingCell, editValue, data, saveMandalaData]);

    const handleBlur = useCallback(() => {
        handleSave();
    }, [handleSave]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setEditingCell(null);
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSave();
        }
    }, [handleSave]);

    const handleGenerateSubMandala = useCallback(async () => {
        const center = (data.center || '').trim();
        if (!center) {
            setGenerateError('中心の目標を入力してから生成してください。');
            return;
        }
        setIsGenerating(true);
        setGenerateError(null);
        const result = await generateSubMandala(center);
        setIsGenerating(false);
        if (result.success) {
            const next: MandalaData = { ...data, cells: result.cells };
            await saveMandalaData(next);
        } else {
            setGenerateError(result.error);
        }
    }, [data, saveMandalaData]);

    const openSubMandala = useCallback((cellIndex: number) => {
        const label = rootData.cells[cellIndex] || DEFAULT_LABELS[cellIndex];
        setViewContext({ level: 'sub', cellIndex, cellLabel: label });
        setGenerateError(null);
    }, [rootData.cells]);

    const closeSubMandala = useCallback(() => {
        setViewContext({ level: 'main' });
        setGenerateError(null);
    }, []);

    const renderCell = (
        key: number | 'center',
        value: string,
        placeholder: string,
        cellIndex?: number,
    ) => {
        const isEditing = editingCell === key;
        const displayValue = value || '';
        const place = placeholder || 'クリックして入力';

        if (isEditing) {
            return (
                <textarea
                    className="mandala-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={place}
                    autoFocus
                    title="Ctrl+Enterで保存、Escでキャンセル"
                />
            );
        }

        const hasSub = viewContext.level === 'main' && cellIndex !== undefined && displayValue;
        return (
            <div className="mandala-cell-inner">
                <div
                    className="mandala-cell-content"
                    onClick={() => handleStartEdit(key, displayValue)}
                    title="クリックして本文を編集"
                >
                    {displayValue || <span className="mandala-placeholder">{place}</span>}
                </div>
                {hasSub && (
                    <button
                        type="button"
                        className="mandala-sub-btn"
                        onClick={(e) => { e.stopPropagation(); openSubMandala(cellIndex); }}
                        title="サブマンダラを開く"
                    >
                        サブ
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="mandala-chart">
            <div className="mandala-header">
                <div className="mandala-breadcrumb">
                    {viewContext.level === 'sub' && (
                        <button
                            type="button"
                            className="mandala-back-btn"
                            onClick={closeSubMandala}
                        >
                            ← 戻る
                        </button>
                    )}
                    <h3 className="mandala-title">
                        {viewContext.level === 'main' ? 'マンダラチャート' : `サブマンダラ: ${viewContext.cellLabel}`}
                    </h3>
                </div>
                <p className="mandala-desc">
                    {viewContext.level === 'main'
                        ? '中心にプロジェクトの目的を、周囲8セルに各視点の本文を入力してください。'
                        : '中心の目標をさらに8つの視点に分解します。'}
                </p>
                <div className="mandala-actions">
                    <button
                        type="button"
                        className="mandala-generate-btn"
                        onClick={handleGenerateSubMandala}
                        disabled={isGenerating || !(data.center || '').trim()}
                        title="中心の目標から8つのサブゴールをAIで自動生成"
                    >
                        {isGenerating ? (
                            <>
                                <span className="mandala-spinner" />
                                生成中...
                            </>
                        ) : (
                            <>AIでサブマンダラ生成</>
                        )}
                    </button>
                    {generateError && (
                        <span className="mandala-error">{generateError}</span>
                    )}
                </div>
            </div>

            <div className="mandala-grid">
                <div className="mandala-cell mandala-cell-top">{renderCell(0, data.cells[0], DEFAULT_LABELS[0], 0)}</div>
                <div className="mandala-cell mandala-cell-top">{renderCell(1, data.cells[1], DEFAULT_LABELS[1], 1)}</div>
                <div className="mandala-cell mandala-cell-top">{renderCell(2, data.cells[2], DEFAULT_LABELS[2], 2)}</div>

                <div className="mandala-cell mandala-cell-mid">{renderCell(3, data.cells[3], DEFAULT_LABELS[3], 3)}</div>
                <div className="mandala-cell mandala-cell-center">
                    {renderCell('center', data.center, 'プロジェクトの目的')}
                </div>
                <div className="mandala-cell mandala-cell-mid">{renderCell(4, data.cells[4], DEFAULT_LABELS[4], 4)}</div>

                <div className="mandala-cell mandala-cell-bottom">{renderCell(5, data.cells[5], DEFAULT_LABELS[5], 5)}</div>
                <div className="mandala-cell mandala-cell-bottom">{renderCell(6, data.cells[6], DEFAULT_LABELS[6], 6)}</div>
                <div className="mandala-cell mandala-cell-bottom">{renderCell(7, data.cells[7], DEFAULT_LABELS[7], 7)}</div>
            </div>
        </div>
    );
};
