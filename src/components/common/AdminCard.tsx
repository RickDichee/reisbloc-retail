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
    // Dynamic color mapping based on brandColor
    const colorMap: any = {
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white',
        amber: 'text-amber-600 bg-amber-50 border-amber-100 group-hover:bg-amber-600 group-hover:text-white',
        rose: 'text-rose-600 bg-rose-50 border-rose-100 group-hover:bg-rose-600 group-hover:text-white',
        slate: 'text-slate-600 bg-slate-50 border-slate-100 group-hover:bg-slate-800 group-hover:text-white',
    }

    const iconStyle = colorMap[brandColor] || colorMap.indigo

    return (
        <button
            onClick={onClick}
            className="group relative p-8 rounded-[2rem] transition-all duration-500 w-full text-left bg-white border border-slate-100 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2 overflow-hidden"
        >
            <div className="flex flex-col h-full relative z-10">
                {/* Icon Header */}
                <div className="flex justify-between items-start mb-8">
                    <div className={`p-5 rounded-2xl transition-all duration-500 ${iconStyle} shadow-sm group-hover:shadow-md`}>
                        <Icon size={32} strokeWidth={2} />
                    </div>
                    <div className="p-3 rounded-full bg-slate-50 text-slate-300 group-hover:bg-white/20 group-hover:text-slate-900 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
                        <ArrowRight size={24} className="-rotate-45 group-hover:rotate-0 transition-transform duration-500" />
                    </div>
                </div>

                {/* Content */}
                <div className="mt-auto space-y-2">
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none group-hover:text-slate-900 transition-colors">
                        {title}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-500 transition-colors">
                        {subtitle}
                    </p>
                </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 scale-0 group-hover:scale-150" />
        </button>
    )
}
