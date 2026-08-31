"use client"

import React, { useState, useCallback } from "react"
import { useBuyerWorkspace } from "@/hooks/useThsuoData"
import { generateAIResponse } from "@/lib/thuso/chatIntegration"
import {
  ThsuoWorkspace,
  ErrorBoundary,
  ResponsiveLayout,
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

  if (!rfqId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No RFQ Selected</h1>
          <p className="text-gray-600">Please select an RFQ to review</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <LoadingState
        isLoading={loading}
        error={error?.message}
        loadingMessage="Loading supplier responses..."
      >
        <ResponsiveLayout
          sidebar={<div className="p-4">{/* BuyerSidebar component */}</div>}
          main={
            <div className="p-4 md:p-6">
              <ThsuoWorkspace
                rfq={activeRfq}
                supplierResponses={supplierResponses}
                smartScores={smartScores}
                messages={messages}
                onSendMessage={handleSendMessage}
                inputValue={inputValue}
                onInputChange={setInputValue}
                isLoading={isLoadingResponse}
                userRole="buyer"
              />
            </div>
          }
        />
      </LoadingState>
    </ErrorBoundary>
  )
}
