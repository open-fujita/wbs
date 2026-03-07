import React from 'react';
import type { ChecklistTemplate } from '../types';
import { BUILTIN_CHECKLIST_TEMPLATES } from '../lib/checklistTemplates';
import './ChecklistTemplateModal.css';

interface ChecklistTemplateModalProps {
    templates: ChecklistTemplate[];
    onSelect: (name: string, items: { title: string }[]) => void;
    onDeleteTemplate: (templateId: string) => Promise<void>;
    onClose: () => void;
}

export const ChecklistTemplateModal: React.FC<ChecklistTemplateModalProps> = ({
    templates, onSelect, onDeleteTemplate, onClose,
}) => {
    const customTemplates = templates.filter(t => !t.isBuiltin);

    const handleDeleteTemplate = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('このテンプレートを削除しますか？')) {
            await onDeleteTemplate(id);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="template-modal-header">
                    <h3 className="modal-title">テンプレートからチェックリストを作成</h3>
                    <button className="template-close-btn" onClick={onClose}>×</button>
                </div>

                {BUILTIN_CHECKLIST_TEMPLATES.map(group => (
                    <div key={group.category} className="template-group">
                        <h4 className="template-group-title">{group.category}</h4>
                        <div className="template-list">
                            {group.templates.map(tmpl => (
                                <div
                                    key={tmpl.name}
                                    className="template-card"
                                    onClick={() => onSelect(tmpl.name, tmpl.items)}
                                >
                                    <div className="template-card-info">
                                        <span className="template-card-name">{tmpl.name}</span>
                                        <span className="template-card-desc">{tmpl.description}</span>
                                    </div>
                                    <span className="template-card-count">{tmpl.items.length}項目</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {customTemplates.length > 0 && (
                    <div className="template-group">
                        <h4 className="template-group-title">カスタムテンプレート</h4>
                        <div className="template-list">
                            {customTemplates.map(tmpl => (
                                <div
                                    key={tmpl.id}
                                    className="template-card"
                                    onClick={() => onSelect(tmpl.name, tmpl.items)}
                                >
                                    <div className="template-card-info">
                                        <span className="template-card-name">{tmpl.name}</span>
                                        <span className="template-card-desc">{tmpl.items.length}項目</span>
                                    </div>
                                    <button
                                        className="template-delete-btn"
                                        onClick={(e) => handleDeleteTemplate(e, tmpl.id)}
                                        title="削除"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
