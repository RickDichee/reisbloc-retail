import React, { ElementType } from 'react'
import { ArrowRight } from 'lucide-react'

interface AdminCardProps {
    title: string
    subtitle: string
    icon: ElementType
    onClick: () => void
    brandColor: string
    gradient?: string
}

export default function AdminCard({
    title,
    subtitle,
    icon: Icon,
    onClick,
    brandColor,
    gradient = 'from-slate-700 to-slate-900'
}: AdminCardProps) {
    return (
        <button
            onClick={onClick}
            className="group relative p-1 rounded-2xl transition-all duration-300 w-full text-left bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300"
        >
            <div className="relative h-full p-6 rounded-xl transition-all duration-300">
                <div className="flex flex-col h-full relative z-10">
                    {/* Icon Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div className={`p-4 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-all duration-300`}>
                            <Icon size={28} strokeWidth={1.5} />
                        </div>
                        <div className="p-2 rounded-full text-gray-400 group-hover:text-indigo-600 transition-colors">
                            <ArrowRight size={20} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="mt-auto">
                        <h3 className="text-xl font-bold text-gray-900 mb-1 tracking-tight group-hover:text-indigo-700 transition-colors">
                            {title}
                        </h3>
                        <p className="text-sm font-medium text-gray-500 group-hover:text-gray-600 leading-relaxed">
                            {subtitle}
                        </p>
                    </div>
                </div>
            </div>
        </button>
    )
}
