import React from 'react'
import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  label?: string
  placeholder?: string
  className?: string
  required?: boolean
}

export default function Select({ 
  value, 
  onChange, 
  options, 
  label, 
  placeholder = 'Выберите...', 
  className,
  required 
}: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm',
          'focus:outline-none focus:ring-pink-500 focus:border-pink-500',
          'bg-white text-gray-900',
          className
        )}
        required={required}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
} 