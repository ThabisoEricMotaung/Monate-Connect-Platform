"use client"

import React from "react"
import { IconLoader2, IconAlertCircle } from "@tabler/icons-react"

interface LoadingStateProps {
  isLoading: boolean
  error?: string | null
  onRetry?: () => void
  loadingMessage?: string
  children: React.ReactNode
}

/**
 * Wrapper component for loading and error states
 * Handles data fetching UI with skeleton, spinner, and error display
 */
export default function LoadingState({
  isLoading,
  error,
  onRetry,
  loadingMessage = "Loading data...",
  children,
}: LoadingStateProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <IconAlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
          Error Loading Data
        </h3>
        <p className="text-red-700 dark:text-red-200 text-center mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Skeleton cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg animate-pulse"
            />
          ))}
        </div>

        {/* Loading indicator */}
        <div className="flex items-center justify-center gap-2 py-8">
          <IconLoader2 className="w-5 h-5 text-primary animate-spin" />
          <span className="text-gray-600 dark:text-gray-400">{loadingMessage}</span>
        </div>
      </div>
    )
  }

  return <div className="animate-fade-in">{children}</div>
}
