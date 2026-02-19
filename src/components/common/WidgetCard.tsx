import React from 'react';

export interface WidgetCardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    action?: React.ReactNode;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
    children,
    className = '',
    title,
    action
}) => {
    return (
        <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col ${className}`}>
            {title && (
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{title}</h3>
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
};

export default WidgetCard;
