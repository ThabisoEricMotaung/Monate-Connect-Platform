export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp?: Date
  context?: {
    rfqId?: number
    userId?: string
    workflowType?: "supplier" | "buyer"
  }
}

export interface ChatContextData {
  rfqId?: number
  userId?: string
  userRole?: "supplier" | "buyer"
  rfqTitle?: string
  completionStatus?: number
  missingDocuments?: string[]
  supplierScores?: Array<{ name: string; score: number }>
  deadline?: string
}

/**
 * Generate context-aware system prompt based on workflow type
 */
export function generateSystemPrompt(contextData: ChatContextData): string {
  const { userRole, rfqTitle, completionStatus, missingDocuments } = contextData

  if (userRole === "supplier") {
    return `You are an AI assistant for AiForm Procure's supplier workspace. Your role is to help suppliers:
- Respond to RFQs and procurement opportunities
- Upload and manage compliance documents
- Understand SmartScore requirements
- Track submission progress and deadlines

Current context:
- RFQ: ${rfqTitle || "Not specified"}
- Completion: ${completionStatus || 0}%
${missingDocuments ? `- Missing: ${missingDocuments.join(", ")}` : ""}

Be helpful, concise, and action-oriented. Guide users toward completing their RFQ response.`
  }

  return `You are an AI assistant for AiForm Procure's buyer workspace. Your role is to help procurement teams:
- Evaluate supplier responses and SmartScores
- Review compliance documentation
- Make informed supplier selection decisions
- Route approvals and manage procurement workflows

Current context:
- RFQ: ${rfqTitle || "Not specified"}

Be analytical, data-driven, and focused on facilitating procurement decisions.`
}

/**
 * Generate context-aware prompt suggestions
 */
export function getContextualPrompts(contextData: ChatContextData): string[] {
  const { userRole, completionStatus, missingDocuments, supplierScores } = contextData

  if (userRole === "supplier") {
    const prompts = [
      "What documents do I need to upload?",
      "How is my SmartScore calculated?",
      "What's the status of my response?",
    ]

    if (missingDocuments && missingDocuments.length > 0) {
      prompts.unshift(`I need to upload ${missingDocuments[0]}. How do I do that?`)
    }

    if (completionStatus && completionStatus < 50) {
      prompts.push("What should I focus on first?")
    }

    if (completionStatus && completionStatus >= 80) {
      prompts.push("I'm ready to submit. What happens next?")
    }

    return prompts
  }

  // Buyer prompts
  const prompts = [
    "Show me all supplier scores for this RFQ",
    "Which suppliers are missing documents?",
    "Who has the highest SmartScore?",
  ]

  if (supplierScores && supplierScores.length > 0) {
    prompts.unshift(`Compare ${supplierScores.map((s) => s.name).join(" vs. ")}`)
  }

  return prompts
}

/**
 * Format RFQ status for AI context
 */
export function formatRFQStatus(rfqId: number, status: string, completionPercent: number): string {
  return `RFQ #${rfqId} is in "${status}" status with ${completionPercent}% completion`
}

/**
 * Parse user intent from message
 */
export function parseUserIntent(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (
    lowerMessage.includes("upload") ||
    lowerMessage.includes("document") ||
    lowerMessage.includes("file")
  ) {
    return "DOCUMENT_UPLOAD"
  }

  if (
    lowerMessage.includes("score") ||
    lowerMessage.includes("smartscore") ||
    lowerMessage.includes("evaluation")
  ) {
    return "SCORE_INQUIRY"
  }

  if (
    lowerMessage.includes("submit") ||
    lowerMessage.includes("send") ||
    lowerMessage.includes("complete")
  ) {
    return "SUBMISSION"
  }

  if (
    lowerMessage.includes("missing") ||
    lowerMessage.includes("requirement") ||
    lowerMessage.includes("need")
  ) {
    return "REQUIREMENTS"
  }

  if (
    lowerMessage.includes("approve") ||
    lowerMessage.includes("route") ||
    lowerMessage.includes("decision")
  ) {
    return "APPROVAL_WORKFLOW"
  }

  return "GENERAL"
}

/**
 * Mock AI response generator (replace with actual API call)
 */
export async function generateAIResponse(
  userMessage: string,
  contextData: ChatContextData,
  conversationHistory: ChatMessage[]
): Promise<string> {
  const userIntent = parseUserIntent(userMessage)
  const systemPrompt = generateSystemPrompt(contextData)

  // This would be replaced with actual API call to Claude or another LLM
  // For now, return contextual responses based on intent

  const responses: Record<string, string> = {
    DOCUMENT_UPLOAD: `To upload your compliance documents, click the paperclip icon in the message input area. Supported formats: PDF, Word, Excel, and images. Max file size: 10MB.`,
    SCORE_INQUIRY: `Your current SmartScore is based on: verification status, BBBEE level, company registration, tax clearance, and CIDB grade. Complete all required documents to improve your score.`,
    SUBMISSION: `Before submitting, ensure all required documents are uploaded and your SmartScore is complete. You can review your submission status in the project status card above.`,
    REQUIREMENTS: `The following documents are required for this RFQ. You can see which ones are missing in the "Missing Documents" section above. Upload each one to complete your response.`,
    APPROVAL_WORKFLOW: `Route this RFQ to Finance for final approval after reviewing all supplier responses and scores. Use the "Route to Finance" button above.`,
    GENERAL: `I'm here to help with your ${contextData.userRole === "supplier" ? "RFQ response" : "supplier evaluation"}. How can I assist?`,
  }

  return responses[userIntent] || responses.GENERAL
}

/**
 * Store chat message (integrates with backend)
 */
export async function saveChatMessage(
  message: ChatMessage,
  rfqId: number,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // This would integrate with Supabase or backend API to persist chat history
    // For now, return success
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save message",
    }
  }
}
