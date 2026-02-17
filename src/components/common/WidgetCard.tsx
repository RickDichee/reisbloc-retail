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
        <div className={`widget-card flex flex-col ${className}`}>
            {title && (
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
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
