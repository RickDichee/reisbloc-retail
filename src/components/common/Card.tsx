import React from 'react'

interface CardProps {
    children: React.ReactNode
    className?: string
    noPadding?: boolean
}

export default function Card({ children, className = '', noPadding = false }: CardProps) {
    return (
        <div className={`card overflow-hidden ${className}`}>
            <div className={noPadding ? '' : 'p-6'}>
                {children}
            </div>
        </div>
    )
}
