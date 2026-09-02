"use client"

import React, { useState, useCallback } from "react"
import { useBuyerWorkspace } from "@/hooks/useThsuoData"
import { generateAIResponse } from "@/lib/thuso/chatIntegration"
import {
  ThsuoWorkspace,
  ErrorBoundary,
  LoadingState,
} from "@/components/thuso"
import "@/styles/thuso-animations.css"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

/**
 * Buyer Workspace Page
 * Full procurement workflow for buyers evaluating supplier responses
 */
export default function BuyerWorkspacePage() {
  // Get RFQ ID from URL params
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
  const rfqId = searchParams ? parseInt(searchParams.get("rfqId") || "0") : 0

  // Data layer
  const { activeRfq, rfqs, supplierResponses, smartScores, loading, error } =
    useBuyerWorkspace(rfqId)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoadingResponse, setIsLoadingResponse] = useState(false)

  // Handle chat message
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !activeRfq) return

    try {
      setIsLoadingResponse(true)

      // Add user message
      const userMessage: ChatMessage = {
        role: "user",
        content: inputValue,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      setInputValue("")

      // Extract supplier scores for context
      const supplierScores = Object.entries(smartScores || {}).map(([key, score]) => ({
        name: `Supplier ${key}`,
        score: score.score,
      }))

      // Generate AI response
      const aiResponse = await generateAIResponse(
        inputValue,
        {
          rfqId,
          userRole: "buyer",
          rfqTitle: activeRfq.title,
          supplierScores,
        },
        [...messages, userMessage]
      )

      // Add AI message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiResponse,
          timestamp: new Date(),
        },
      ])
    } catch (err) {
      console.error("Chat error:", err)
      alert("Failed to get response")
    } finally {
      setIsLoadingResponse(false)
    }
  }, [inputValue, activeRfq, rfqId, messages, smartScores])

  return (
    <ErrorBoundary>
      <LoadingState
        isLoading={loading}
        error={error}
        loadingMessage="Loading supplier responses..."
      >
        <div className="min-w-0 px-2 py-4 sm:px-4 lg:px-6">
          <ThsuoWorkspace rfqId={rfqId} userId="current-user-id" />
        </div>
      </LoadingState>
    </ErrorBoundary>
  )
}
