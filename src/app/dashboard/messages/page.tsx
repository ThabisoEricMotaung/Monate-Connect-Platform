"use client"

import {
  IconArchive,
  IconArrowLeft,
  IconBell,
  IconBold,
  IconExternalLink,
  IconFile,
  IconItalic,
  IconMail,
  IconMoodSmile,
  IconPaperclip,
  IconPlus,
  IconSend,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import Link from "next/link"
import { FormEvent, KeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ProfileImage, initialsFromName } from "@/components/ProfileImage"
import {
  getDeletedMessages,
  getInboxMessages,
  getSentMessages,
  markMessageUnread,
  markMessageRead,
  removeThreadFromInbox,
  restoreThreadToInbox,
  sendMessage,
  type ProcurementMessage,
} from "@/lib/messages"
import {
  getNotifications,
  markNotificationRead,
  type Notification,
} from "@/lib/notifications"
import { getCurrentProfile, getCurrentUser, hasAdminOrBuyerAccess, type AuthProfile } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type NotificationTab = "all" | "action" | "updates"
type ContextType = "RFQ" | "Quote" | "Contract" | "PO"
type ScreenMode = "threads" | "conversation"
type InboxTab = "inbox" | "sent" | "archives" | "drafts" | "recentlyDeleted"
type EmojiPickerTarget = "reply" | "new" | null

type ProfileSummary = {
  id: string
  business_name: string | null
  full_name?: string | null
  email: string | null
  role: string | null
  province?: string | null
  avatar_url?: string | null
}

type RfqSummary = {
  id: number
  title: string | null
  province: string | null
  category: string | null
  budget: string | null
  deadline: string | null
  buyer_name?: string | null
  buyer?: string | null
  organization_name?: string | null
}

type MessageAttachment = {
  id: string
  name: string
  size: string
  href?: string
}

type LocalMessage = ProcurementMessage & {
  attachments?: MessageAttachment[]
  optimistic?: boolean
}

type ThreadMessage = LocalMessage & {
  mine: boolean
}

type Thread = {
  id: string
  senderName: string
  senderRole: string | null
  senderAvatarUrl: string | null
  senderOrg: string
  contextType: ContextType
  contextTitle: string
  subject: string
  preview: string
  timestamp: string | null
  unread: boolean
  platform: boolean
  archived: boolean
  rfqId: number | null
  quoteId: number | null
  counterpartId: string
  buyerOrg: string
  province: string | null
  value: string | null
  deadline: string | null
  messages: ThreadMessage[]
}

type MessageDraft = {
  id: string
  recipientId: string
  recipientName: string
  subject: string
  body: string
  savedAt: string
}

function profileName(profile: ProfileSummary | undefined, fallback = "Platform"): string {
  if (!profile) return fallback

  return profile.business_name || profile.full_name || profile.email || fallback
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Just now"

  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000))

  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes}m`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d`

  return date.toLocaleDateString("en-ZA", { month: "short", day: "numeric" })
}

function longDate(dateStr: string | null): string {
  if (!dateStr) return "recently"

  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatMessageTime(dateStr: string | null): string {
  if (!dateStr) return "Sending..."

  return new Date(dateStr).toLocaleString("en-ZA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null

  const deadline = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(deadline.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000)
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function inferContextType(message: ProcurementMessage): ContextType {
  if (message.quote_id != null) return "Quote"
  if (message.rfq_id != null) return "RFQ"
  if (message.subject.toLowerCase().includes("contract")) return "Contract"
  if (message.subject.toLowerCase().includes("purchase order") || message.subject.toLowerCase().includes(" po ")) return "PO"

  return "RFQ"
}

function documentHref(thread: Thread, isAdminOrBuyer: boolean): string | null {
  if (thread.rfqId) {
    return isAdminOrBuyer
      ? `/dashboard/admin/rfqs/${thread.rfqId}`
      : `/dashboard/rfqs/${thread.rfqId}`
  }

  if (thread.quoteId) {
    return isAdminOrBuyer
      ? `/dashboard/admin/quotes`
      : `/dashboard/quotes`
  }

  return null
}

function documentLabel(thread: Thread): string {
  if (thread.rfqId) return "View related RFQ"
  if (thread.quoteId) return "View related quote"

  return "View related document"
}

function conversationHref(thread: Thread): string {
  return `/dashboard/messages?thread=${encodeURIComponent(thread.id)}`
}

function avatarTone(role: string | null, platform: boolean): string {
  if (platform) return "border-warning bg-warning-soft text-warning"
  if (role === "buyer" || role === "admin") return "border-accent-soft bg-accent-soft text-accent-strong"
  if (role === "supplier") return "border-success bg-success-soft text-success"

  return "border-panel bg-panel text-muted"
}

function notificationTone(type: string): string {
  const lowerType = type.toLowerCase()

  if (
    lowerType.includes("deadline") ||
    lowerType.includes("expir") ||
    lowerType.includes("action") ||
    lowerType.includes("rejected")
  ) {
    return "border-warning bg-warning-soft text-warning"
  }

  if (
    lowerType.includes("awarded") ||
    lowerType.includes("approved") ||
    lowerType.includes("verified") ||
    lowerType.includes("issued") ||
    lowerType.includes("signed")
  ) {
    return "border-success bg-success-soft text-success"
  }

  if (lowerType.includes("submitted") || lowerType.includes("viewed")) {
    return "border-panel bg-panel text-muted"
  }

  return "border-accent-soft bg-accent-soft text-accent-strong"
}

function notificationIsActionable(notification: Notification): boolean {
  const text = `${notification.type} ${notification.title}`.toLowerCase()

  return (
    text.includes("deadline") ||
    text.includes("expir") ||
    text.includes("action") ||
    text.includes("signature") ||
    text.includes("contract") ||
    text.includes("request")
  )
}

function notificationActionLabel(notification: Notification): string | null {
  if (!notification.link) return null

  const text = `${notification.type} ${notification.title}`.toLowerCase()

  if (text.includes("message")) return "Reply ->"
  if (text.includes("quote")) return "View quote ->"
  if (text.includes("profile") || text.includes("verification") || text.includes("expir")) return "Update now ->"
  if (text.includes("rfq")) return "View RFQ ->"

  return "Open ->"
}

function buildThreads({
  messages,
  currentUserId,
  profiles,
  rfqs,
  archivedIds,
}: {
  messages: LocalMessage[]
  currentUserId: string
  profiles: Record<string, ProfileSummary>
  rfqs: Record<number, RfqSummary>
  archivedIds: Set<string>
}): Thread[] {
  const groups = new Map<string, ThreadMessage[]>()

  messages.forEach((message) => {
    const mine = message.sender_id === currentUserId
    const counterpartId = mine ? message.receiver_id : message.sender_id
    const key = [
      counterpartId,
      message.rfq_id ?? "no-rfq",
      message.quote_id ?? "no-quote",
      message.subject.trim().toLowerCase() || "general",
    ].join(":")

    const nextMessage = { ...message, mine }
    groups.set(key, [...(groups.get(key) ?? []), nextMessage])
  })

  return Array.from(groups.entries())
    .map(([id, threadMessages]) => {
      const sortedMessages = [...threadMessages].sort(
        (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime(),
      )
      const firstMessage = sortedMessages[0]
      const lastMessage = sortedMessages[sortedMessages.length - 1]
      const counterpartId = firstMessage.mine ? firstMessage.receiver_id : firstMessage.sender_id
      const counterpart = profiles[counterpartId]
      const senderName = profileName(counterpart)
      const rfq = firstMessage.rfq_id != null ? rfqs[firstMessage.rfq_id] : undefined
      const contextType = inferContextType(firstMessage)
      const contextTitle =
        rfq?.title ||
        firstMessage.subject ||
        (firstMessage.rfq_id != null ? `RFQ-${firstMessage.rfq_id}` : "Procurement conversation")
      const buyerOrg = rfq?.buyer_name || rfq?.buyer || rfq?.organization_name || "Procurement buyer"
      const unread = sortedMessages.some((message) => !message.mine && !message.is_read)

      return {
        id,
        senderName,
        senderRole: counterpart?.role ?? null,
        senderAvatarUrl: counterpart?.avatar_url ?? null,
        senderOrg: counterpart?.business_name || counterpart?.email || senderName,
        contextType,
        contextTitle,
        subject: firstMessage.subject,
        preview: lastMessage.message,
        timestamp: lastMessage.created_at,
        unread,
        platform: false,
        archived: archivedIds.has(id),
        rfqId: firstMessage.rfq_id,
        quoteId: firstMessage.quote_id,
        counterpartId,
        buyerOrg,
        province: rfq?.province ?? counterpart?.province ?? null,
        value: rfq?.budget ?? null,
        deadline: rfq?.deadline ?? null,
        messages: sortedMessages,
      }
    })
    .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())
}

// Soft-deleted messages are kept indefinitely for now. A retention purge (for example
// 30/60/90 days) can be added later once product policy and audit needs are clearer.

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d8c79d]/50 bg-[#f8f4ec] text-[#1a3a2a] transition hover:border-[#c8a060] hover:bg-white"
    >
      {children}
    </button>
  )
}

const MESSAGE_EMOJIS = ["👍", "✅", "😊", "🙏", "📎", "📅", "💼", "🎉"]

function FormattedMessageText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g)

  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={index}>{part.slice(1, -1)}</em>
        }
        return <span key={index}>{part}</span>
      })}
    </span>
  )
}

function ThreadAvatar({ thread }: { thread: Thread }) {
  const fallbackName = thread.platform ? "Monate" : thread.senderName

  return (
    <ProfileImage
      src={thread.senderAvatarUrl}
      alt={`${fallbackName} avatar`}
      className="h-10 w-10 rounded-full border object-cover"
      fallbackClassName={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${avatarTone(
        thread.senderRole,
        thread.platform,
      )}`}
      fallbackText={thread.platform ? "M" : initialsFromName(thread.senderName, "M")}
      seedName={fallbackName}
    />
  )
}

export default function MessagesPage() {
  const router = useRouter()
  const feedRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const newMessageTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [currentUserId, setCurrentUserId] = useState("")
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [deletedMessages, setDeletedMessages] = useState<LocalMessage[]>([])
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({})
  const [rfqs, setRfqs] = useState<Record<number, RfqSummary>>({})
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activeThreadId, setActiveThreadId] = useState("")
  const [notificationTab, setNotificationTab] = useState<NotificationTab>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set())
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set())
  const [drafts, setDrafts] = useState<MessageDraft[]>([])
  const [replyText, setReplyText] = useState("")
  const [pendingFiles, setPendingFiles] = useState<MessageAttachment[]>([])
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [showNotifications, setShowNotifications] = useState(false)
  const [inboxTab, setInboxTab] = useState<InboxTab>("inbox")
  const [restoringThreadIds, setRestoringThreadIds] = useState<Set<string>>(new Set())
  const [restoringSelected, setRestoringSelected] = useState(false)
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [recipientOptions, setRecipientOptions] = useState<ProfileSummary[]>([])
  const [recipientSearch, setRecipientSearch] = useState("")
  const [newRecipientId, setNewRecipientId] = useState("")
  const [newSubject, setNewSubject] = useState("")
  const [newBody, setNewBody] = useState("")
  const [composerError, setComposerError] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<EmojiPickerTarget>(null)
  const [screenMode, setScreenMode] = useState<ScreenMode>("threads")

  const isAdminOrBuyer = hasAdminOrBuyerAccess(profile)

  const loadProfilesForMessages = useCallback(async (loadedMessages: ProcurementMessage[]) => {
    if (!supabase || loadedMessages.length === 0) {
      setProfiles({})
      return
    }

    const profileIds = Array.from(
      new Set(
        loadedMessages.flatMap((message) => [
          message.sender_id,
          message.receiver_id,
        ]),
      ),
    )

    const { data, error } = await supabase
      .from("profiles")
      .select("id, business_name, full_name, email, role, province, avatar_url")
      .in("id", profileIds)

    if (error) {
      console.error("Message profile lookup failed:", error)
      setProfiles({})
      return
    }

    setProfiles(
      Object.fromEntries(
        ((data ?? []) as ProfileSummary[]).map((nextProfile) => [
          nextProfile.id,
          nextProfile,
        ]),
      ),
    )
  }, [])

  const loadRfqContext = useCallback(async (loadedMessages: ProcurementMessage[]) => {
    if (!supabase) return

    const rfqIds = Array.from(
      new Set(
        loadedMessages
          .map((message) => message.rfq_id)
          .filter((rfqId): rfqId is number => rfqId != null),
      ),
    )

    if (rfqIds.length === 0) {
      setRfqs({})
      return
    }

    const { data, error } = await supabase
      .from("rfqs")
      .select("id, title, province, category, budget, deadline, buyer_name, buyer, organization_name")
      .in("id", rfqIds)

    if (error) {
      console.error("Message RFQ context lookup failed:", error)
      setRfqs({})
      return
    }

    setRfqs(
      Object.fromEntries(
        ((data ?? []) as RfqSummary[]).map((rfq) => [rfq.id, rfq]),
      ),
    )
  }, [])

  const loadPageData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true)
      setErrorMessage("")
    }

    try {
      const [currentUser, currentProfile, inbox, sent, deleted, loadedNotifications] = await Promise.all([
        getCurrentUser(),
        getCurrentProfile(),
        getInboxMessages(),
        getSentMessages(),
        getDeletedMessages(),
        getNotifications(),
      ])

      const allMessages = [...inbox, ...sent]
      const contextMessages = [...allMessages, ...deleted]

      setCurrentUserId(currentUser?.id ?? "")
      setProfile(currentProfile)
      setMessages(allMessages)
      setDeletedMessages(deleted)
      setNotifications(loadedNotifications)
      await Promise.all([
        loadProfilesForMessages(contextMessages),
        loadRfqContext(contextMessages),
      ])

      if (supabase && currentUser?.id && currentProfile) {
        const normalizedRole = currentProfile.role?.trim().toLowerCase()
        const allowedRoles =
          normalizedRole === "admin"
            ? ["buyer", "supplier"]
            : normalizedRole === "supplier"
              ? ["buyer", "admin"]
              : ["supplier"]
        const { data: recipients, error: recipientError } = await supabase
          .from("profiles")
          .select("id, business_name, full_name, email, role, province, avatar_url")
          .in("role", allowedRoles)
          .neq("id", currentUser.id)
          .order("business_name", { ascending: true })

        if (recipientError) {
          console.error("Recipient lookup failed:", recipientError)
        } else {
          setRecipientOptions((recipients ?? []) as ProfileSummary[])
        }
      }
    } catch (error) {
      console.error("Messages workspace failed to load:", error)
      setErrorMessage("Messages could not be loaded right now.")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [loadProfilesForMessages, loadRfqContext])

  useEffect(() => {
    loadPageData()
  }, [loadPageData])

  useEffect(() => {
    if (typeof window === "undefined") return

    function openNotificationsPanel() {
      setShowNotifications(true)
      setNotificationTab("all")
    }

    const params = new URLSearchParams(window.location.search)

    if (params.get("notifications") === "1" || params.get("panel") === "notifications") {
      openNotificationsPanel()
    }

    window.addEventListener("open-notifications-panel", openNotificationsPanel)
    return () => window.removeEventListener("open-notifications-panel", openNotificationsPanel)
  }, [])

  useEffect(() => {
    if (!supabase || !currentUserId) return

    const client = supabase
    const messageChannel = client
      .channel(`messages-page-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        () => loadPageData({ silent: true }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${currentUserId}`,
        },
        () => loadPageData({ silent: true }),
      )
      .subscribe()

    const notificationChannel = client
      .channel(`messages-notifications-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => loadPageData({ silent: true }),
      )
      .subscribe()

    return () => {
      client.removeChannel(messageChannel)
      client.removeChannel(notificationChannel)
    }
  }, [currentUserId, loadPageData])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadPageData({ silent: true })
      }
    }, 30_000)

    return () => window.clearInterval(intervalId)
  }, [loadPageData])

  const allThreads = useMemo(() => {
    if (!currentUserId) return []

    return buildThreads({
        messages,
        currentUserId,
        profiles,
        rfqs,
        archivedIds,
      })
  }, [archivedIds, currentUserId, messages, profiles, rfqs])

  const sentThreads = useMemo(() => {
    if (!currentUserId) return []

    return buildThreads({
      messages: messages.filter((message) => message.sender_id === currentUserId),
      currentUserId,
      profiles,
      rfqs,
      archivedIds,
    })
  }, [archivedIds, currentUserId, messages, profiles, rfqs])

  const deletedThreads = useMemo(() => {
    if (!currentUserId) return []

    return buildThreads({
      messages: deletedMessages,
      currentUserId,
      profiles,
      rfqs,
      archivedIds: new Set(),
    })
  }, [currentUserId, deletedMessages, profiles, rfqs])

  const inboxThreads = useMemo(
    () => allThreads.filter((thread) => !thread.archived && thread.messages.some((message) => !message.mine)),
    [allThreads],
  )

  const archivedThreads = useMemo(
    () => allThreads.filter((thread) => thread.archived),
    [allThreads],
  )

  const threads = useMemo(() => {
    if (inboxTab === "sent") return sentThreads
    if (inboxTab === "archives") return archivedThreads
    if (inboxTab === "recentlyDeleted") return deletedThreads
    if (inboxTab === "drafts") return []

    return inboxThreads
  }, [archivedThreads, deletedThreads, inboxTab, inboxThreads, sentThreads])

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? threads[0] ?? null,
    [activeThreadId, threads],
  )

  const unreadMessageCount = useMemo(
    () => messages.filter((message) => message.receiver_id === currentUserId && !message.is_read).length,
    [currentUserId, messages],
  )

  const unreadNotificationCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  )

  const unreadInboxCount = unreadMessageCount

  const visibleThreads = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return threads.filter((thread) => {
      if (!normalizedSearch) return true

      return [
        thread.senderName,
        thread.contextTitle,
        thread.preview,
        thread.subject,
        thread.buyerOrg,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [searchTerm, threads])

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        if (notificationTab === "action") return notificationIsActionable(notification)
        if (notificationTab === "updates") return !notificationIsActionable(notification)

        return true
      }),
    [notificationTab, notifications],
  )

  useEffect(() => {
    if (!activeThread && visibleThreads[0]) {
      setActiveThreadId(visibleThreads[0].id)
      return
    }

    if (activeThread && !threads.some((thread) => thread.id === activeThread.id) && visibleThreads[0]) {
      setActiveThreadId(visibleThreads[0].id)
    }
  }, [activeThread, threads, visibleThreads])

  useEffect(() => {
    if (typeof window === "undefined" || allThreads.length === 0) return

    const threadId = new URLSearchParams(window.location.search).get("thread")
    if (!threadId || activeThreadId) return

    const matchingThread = allThreads.find((thread) => thread.id === threadId)
    if (matchingThread) {
      setInboxTab(matchingThread.archived ? "archives" : "inbox")
      setActiveThreadId(matchingThread.id)
      setScreenMode("conversation")
    }
  }, [activeThreadId, allThreads])

  useEffect(() => {
    feedRef.current?.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [activeThread?.id, activeThread?.messages.length])

  useEffect(() => {
    if (!textareaRef.current) return

    textareaRef.current.style.height = "auto"
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 132)}px`
  }, [replyText])

  async function openThread(thread: Thread) {
    setActiveThreadId(thread.id)
    setScreenMode("conversation")
    setShowNotifications(false)

    if (thread.platform) {
      const notificationId = Number(thread.id.replace("platform:", ""))
      const notification = notifications.find((item) => item.id === notificationId)

      if (notification && !notification.read) {
        setNotifications((currentNotifications) =>
          currentNotifications.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        )
        try {
          await markNotificationRead(notification.id)
        } catch {
          setNotifications((currentNotifications) =>
            currentNotifications.map((item) =>
              item.id === notification.id ? { ...item, read: false } : item,
            ),
          )
        }
      }
      return
    }

    const unreadMessages = thread.messages.filter((message) => !message.mine && !message.is_read)

    if (unreadMessages.length > 0) {
      await Promise.all(unreadMessages.map((message) => markMessageRead(message.id)))
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          unreadMessages.some((unreadMessage) => unreadMessage.id === message.id)
            ? { ...message, is_read: true }
            : message,
        ),
      )
    }
  }

  function archiveActiveThread() {
    if (!activeThread) return

    setArchivedIds((currentIds) => new Set(currentIds).add(activeThread.id))
    setSelectedThreadIds((currentIds) => {
      const nextIds = new Set(currentIds)
      nextIds.delete(activeThread.id)
      return nextIds
    })
    setActiveThreadId("")
    setScreenMode("threads")
    setStatusMessage("Conversation moved to Archives.")
    window.setTimeout(() => setStatusMessage(""), 4_000)
  }

  async function deleteActiveThread() {
    if (!activeThread || activeThread.platform) return
    if (!window.confirm("Remove this conversation from your Inbox? The other participant will keep their copy.")) {
      return
    }

    setErrorMessage("")
    try {
      await removeThreadFromInbox(activeThread.messages.filter((message) => message.id > 0).map((message) => message.id))
      const removedIds = new Set(activeThread.messages.map((message) => message.id))
      setMessages((currentMessages) => currentMessages.filter((message) => !removedIds.has(message.id)))
      setDeletedMessages((currentMessages) => [
        ...currentMessages.filter((message) => !removedIds.has(message.id)),
        ...activeThread.messages.map((message) => ({
          ...message,
          deleted_by_sender: message.mine ? true : message.deleted_by_sender,
          deleted_by_receiver: message.mine ? message.deleted_by_receiver : true,
        })),
      ])
      setSelectedThreadIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(activeThread.id)
        return nextIds
      })
      setActiveThreadId("")
      setScreenMode("threads")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Conversation could not be removed.")
    }
  }

  async function restoreThread(thread: Thread) {
    if (!thread || thread.platform) return

    setErrorMessage("")
    setRestoringThreadIds((currentIds) => new Set(currentIds).add(thread.id))
    try {
      const messageIds = thread.messages.filter((message) => message.id > 0).map((message) => message.id)
      await restoreThreadToInbox(messageIds)
      const restoredIds = new Set(messageIds)
      const restoredMessages = deletedMessages.filter((message) => restoredIds.has(message.id))
      setDeletedMessages((currentMessages) => currentMessages.filter((message) => !restoredIds.has(message.id)))
      setMessages((currentMessages) => {
        const currentIds = new Set(currentMessages.map((message) => message.id))
        return [
          ...currentMessages,
          ...restoredMessages
            .filter((message) => !currentIds.has(message.id))
            .map((message) => ({
              ...message,
              deleted_by_sender: message.sender_id === currentUserId ? false : message.deleted_by_sender,
              deleted_by_receiver: message.receiver_id === currentUserId ? false : message.deleted_by_receiver,
            })),
        ]
      })
      setSelectedThreadIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(thread.id)
        return nextIds
      })
      setActiveThreadId("")
      setScreenMode("threads")
      setStatusMessage("Conversation restored to Inbox.")
      window.setTimeout(() => setStatusMessage(""), 4_000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Conversation could not be restored.")
    } finally {
      setRestoringThreadIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(thread.id)
        return nextIds
      })
    }
  }

  async function markActiveUnread() {
    if (!activeThread || activeThread.platform) return

    const lastInbound = [...activeThread.messages].reverse().find((message) => !message.mine)
    if (!lastInbound) {
      setStatusMessage("Only received messages can be marked unread.")
      window.setTimeout(() => setStatusMessage(""), 4_000)
      return
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === lastInbound.id ? { ...message, is_read: false } : message,
      ),
    )

    try {
      await markMessageUnread(lastInbound.id)
      setStatusMessage("Conversation marked unread.")
      window.setTimeout(() => setStatusMessage(""), 4_000)
    } catch (error) {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === lastInbound.id ? { ...message, is_read: true } : message,
        ),
      )
      setErrorMessage(error instanceof Error ? error.message : "Conversation could not be marked unread.")
    }
  }

  function toggleThreadSelection(threadId: string) {
    setSelectedThreadIds((currentIds) => {
      const nextIds = new Set(currentIds)
      if (nextIds.has(threadId)) {
        nextIds.delete(threadId)
      } else {
        nextIds.add(threadId)
      }
      return nextIds
    })
  }

  function toggleSelectAllVisible() {
    setSelectedThreadIds((currentIds) => {
      const selectableIds = visibleThreads.filter((thread) => !thread.platform).map((thread) => thread.id)
      const allSelected = selectableIds.length > 0 && selectableIds.every((id) => currentIds.has(id))
      const nextIds = new Set(currentIds)

      selectableIds.forEach((id) => {
        if (allSelected) {
          nextIds.delete(id)
        } else {
          nextIds.add(id)
        }
      })

      return nextIds
    })
  }

  async function deleteSelectedThreads() {
    const selectedThreads = visibleThreads.filter((thread) => selectedThreadIds.has(thread.id) && !thread.platform)
    if (selectedThreads.length === 0) return
    if (!window.confirm(`Remove ${selectedThreads.length} selected conversation${selectedThreads.length === 1 ? "" : "s"} from your Inbox? The other participant will keep their copy.`)) {
      return
    }

    setErrorMessage("")
    try {
      const messageIds = selectedThreads.flatMap((thread) =>
        thread.messages.filter((message) => message.id > 0).map((message) => message.id),
      )
      await removeThreadFromInbox(messageIds)
      const removedIds = new Set(messageIds)
      const removedThreadIds = new Set(selectedThreads.map((thread) => thread.id))
      setMessages((currentMessages) => currentMessages.filter((message) => !removedIds.has(message.id)))
      setDeletedMessages((currentMessages) => [
        ...currentMessages.filter((message) => !removedIds.has(message.id)),
        ...selectedThreads.flatMap((thread) =>
          thread.messages.map((message) => ({
            ...message,
            deleted_by_sender: message.mine ? true : message.deleted_by_sender,
            deleted_by_receiver: message.mine ? message.deleted_by_receiver : true,
          })),
        ),
      ])
      setSelectedThreadIds((currentIds) => {
        const nextIds = new Set(currentIds)
        removedThreadIds.forEach((id) => nextIds.delete(id))
        return nextIds
      })
      if (activeThread && removedThreadIds.has(activeThread.id)) {
        setActiveThreadId("")
        setScreenMode("threads")
      }
      setStatusMessage(`${selectedThreads.length} conversation${selectedThreads.length === 1 ? "" : "s"} removed.`)
      window.setTimeout(() => setStatusMessage(""), 4_000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Selected conversations could not be removed.")
    }
  }

  async function restoreSelectedThreads() {
    const selectedThreads = deletedThreads.filter((thread) => selectedThreadIds.has(thread.id) && !thread.platform)
    if (selectedThreads.length === 0) return

    setErrorMessage("")
    setRestoringSelected(true)
    try {
      const messageIds = selectedThreads.flatMap((thread) =>
        thread.messages.filter((message) => message.id > 0).map((message) => message.id),
      )
      await restoreThreadToInbox(messageIds)
      const restoredIds = new Set(messageIds)
      const restoredMessages = deletedMessages.filter((message) => restoredIds.has(message.id))
      const restoredThreadIds = new Set(selectedThreads.map((thread) => thread.id))
      setDeletedMessages((currentMessages) => currentMessages.filter((message) => !restoredIds.has(message.id)))
      setMessages((currentMessages) => {
        const currentIds = new Set(currentMessages.map((message) => message.id))
        return [
          ...currentMessages,
          ...restoredMessages
            .filter((message) => !currentIds.has(message.id))
            .map((message) => ({
              ...message,
              deleted_by_sender: message.sender_id === currentUserId ? false : message.deleted_by_sender,
              deleted_by_receiver: message.receiver_id === currentUserId ? false : message.deleted_by_receiver,
            })),
        ]
      })
      setSelectedThreadIds((currentIds) => {
        const nextIds = new Set(currentIds)
        restoredThreadIds.forEach((id) => nextIds.delete(id))
        return nextIds
      })
      if (activeThread && restoredThreadIds.has(activeThread.id)) {
        setActiveThreadId("")
        setScreenMode("threads")
      }
      setStatusMessage(`${selectedThreads.length} conversation${selectedThreads.length === 1 ? "" : "s"} restored to Inbox.`)
      window.setTimeout(() => setStatusMessage(""), 4_000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Selected conversations could not be restored.")
    } finally {
      setRestoringSelected(false)
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return

    setPendingFiles(
      Array.from(files).map((file) => ({
        id: `${file.name}-${file.lastModified}`,
        name: file.name,
        size: fileSize(file.size),
      })),
    )
  }

  async function handleSend(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    if (!activeThread || activeThread.platform || !replyText.trim()) return

    setSending(true)
    setErrorMessage("")

    const tempId = -Date.now()
    const optimisticAttachments = pendingFiles
    const optimisticMessage: LocalMessage = {
      id: tempId,
      sender_id: currentUserId,
      receiver_id: activeThread.counterpartId,
      subject: activeThread.subject || activeThread.contextTitle,
      message: replyText.trim(),
      rfq_id: activeThread.rfqId,
      quote_id: activeThread.quoteId,
      is_read: true,
      deleted_by_sender: false,
      deleted_by_receiver: false,
      created_at: new Date().toISOString(),
      attachments: optimisticAttachments,
      optimistic: true,
    }

    setMessages((currentMessages) => [...currentMessages, optimisticMessage])
    const nextReply = replyText.trim()
    setReplyText("")

    try {
      const sent = await sendMessage({
        receiverId: activeThread.counterpartId,
        subject: activeThread.subject || activeThread.contextTitle,
        message: nextReply,
        rfqId: activeThread.rfqId,
        quoteId: activeThread.quoteId,
      })

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === tempId ? { ...sent, attachments: optimisticAttachments } : message,
        ),
      )
      setPendingFiles([])
    } catch (error) {
      console.error("Reply failed:", error)
      setMessages((currentMessages) => currentMessages.filter((message) => message.id !== tempId))
      setReplyText(nextReply)
      setErrorMessage(error instanceof Error ? error.message : "Message could not be sent.")
    } finally {
      setSending(false)
    }
  }

  function insertComposerText(
    target: "reply" | "new",
    text: string,
  ) {
    const ref = target === "reply" ? textareaRef : newMessageTextareaRef
    const value = target === "reply" ? replyText : newBody
    const setValue = target === "reply" ? setReplyText : setNewBody
    const textarea = ref.current
    const start = textarea?.selectionStart ?? value.length
    const end = textarea?.selectionEnd ?? value.length

    setValue(`${value.slice(0, start)}${text}${value.slice(end)}`)
    window.requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(start + text.length, start + text.length)
    })
  }

  function formatComposerSelection(
    target: "reply" | "new",
    marker: "*" | "**",
  ) {
    const ref = target === "reply" ? textareaRef : newMessageTextareaRef
    const value = target === "reply" ? replyText : newBody
    const setValue = target === "reply" ? setReplyText : setNewBody
    const textarea = ref.current
    const start = textarea?.selectionStart ?? value.length
    const end = textarea?.selectionEnd ?? value.length
    const selected = value.slice(start, end)
    const replacement = `${marker}${selected || "text"}${marker}`

    setValue(`${value.slice(0, start)}${replacement}${value.slice(end)}`)
    window.requestAnimationFrame(() => {
      textarea?.focus()
      const selectionStart = start + marker.length
      textarea?.setSelectionRange(selectionStart, selectionStart + (selected || "text").length)
    })
  }

  function saveNewMessageDraft() {
    if (!newRecipientId && !newSubject.trim() && !newBody.trim()) {
      setShowNewMessage(false)
      return
    }

    const recipient = recipientOptions.find((option) => option.id === newRecipientId)
    setDrafts((currentDrafts) => [
      {
        id: crypto.randomUUID(),
        recipientId: newRecipientId,
        recipientName: recipient ? profileName(recipient) : recipientSearch || "No recipient selected",
        subject: newSubject.trim() || "Untitled draft",
        body: newBody.trim(),
        savedAt: new Date().toISOString(),
      },
      ...currentDrafts,
    ])
    setNewRecipientId("")
    setNewSubject("")
    setNewBody("")
    setRecipientSearch("")
    setShowNewMessage(false)
    setInboxTab("drafts")
    setStatusMessage("Draft saved for this session.")
    window.setTimeout(() => setStatusMessage(""), 4_000)
  }

  function openDraft(draft: MessageDraft) {
    setNewRecipientId(draft.recipientId)
    setRecipientSearch(draft.recipientName)
    setNewSubject(draft.subject === "Untitled draft" ? "" : draft.subject)
    setNewBody(draft.body)
    setDrafts((currentDrafts) => currentDrafts.filter((item) => item.id !== draft.id))
    setShowNewMessage(true)
  }

  async function handleNewMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setComposerError("")
    if (!newRecipientId || !newSubject.trim() || !newBody.trim()) {
      setComposerError("Choose a recipient and enter a subject and message.")
      return
    }

    setSending(true)
    setErrorMessage("")
    try {
      const sent = await sendMessage({
        receiverId: newRecipientId,
        subject: newSubject,
        message: newBody,
      })
      const recipient = recipientOptions.find((option) => option.id === newRecipientId)
      if (recipient) {
        setProfiles((current) => ({ ...current, [recipient.id]: recipient }))
      }
      setMessages((current) => [...current, sent])
      setNewRecipientId("")
      setNewSubject("")
      setNewBody("")
      setRecipientSearch("")
      setShowNewMessage(false)
      setInboxTab("sent")
      setDrafts((currentDrafts) =>
        currentDrafts.filter(
          (draft) =>
            draft.recipientId !== newRecipientId ||
            draft.subject !== (newSubject.trim() || "Untitled draft") ||
            draft.body !== newBody.trim(),
        ),
      )
      setStatusMessage("Message sent successfully.")
      window.setTimeout(() => setStatusMessage(""), 4_000)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Message could not be sent."
      setComposerError(message)
      setErrorMessage(message)
    } finally {
      setSending(false)
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return

    event.preventDefault()
    handleSend()
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      setNotifications((currentNotifications) =>
        currentNotifications.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item,
        ),
      )
      try {
        await markNotificationRead(notification.id)
      } catch {
        setNotifications((currentNotifications) =>
          currentNotifications.map((item) =>
            item.id === notification.id ? { ...item, read: false } : item,
          ),
        )
      }
    }

    const linkedThread = threads.find(
      (thread) =>
        !thread.platform &&
        (notification.link?.includes(`/dashboard/messages`) ||
          (thread.rfqId != null && notification.link?.includes(String(thread.rfqId))) ||
          notification.title.toLowerCase().includes(thread.senderName.toLowerCase())),
    )

    if (linkedThread) {
      openThread(linkedThread)
      return
    }

    if (notification.link) {
      router.push(notification.link)
    }
  }

  async function markAllNotificationsRead() {
    const unreadNotifications = notifications.filter((notification) => !notification.read)

    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({ ...notification, read: true })),
    )
    try {
      await Promise.all(unreadNotifications.map((notification) => markNotificationRead(notification.id)))
    } catch {
      loadPageData({ silent: true })
    }
  }

  const deadlineDays = activeThread ? daysUntil(activeThread.deadline) : null
  const showDeadlineWarning = deadlineDays != null && deadlineDays >= 0 && deadlineDays <= 3
  const relatedDocumentHref = activeThread ? documentHref(activeThread, isAdminOrBuyer) : null
  const selectableVisibleThreads = visibleThreads.filter((thread) => !thread.platform)
  const selectedVisibleCount = selectableVisibleThreads.filter((thread) => selectedThreadIds.has(thread.id)).length
  const allVisibleSelected =
    selectableVisibleThreads.length > 0 &&
    selectableVisibleThreads.every((thread) => selectedThreadIds.has(thread.id))

  const matchingRecipients = recipientOptions.filter((recipient) =>
    [recipient.business_name, recipient.full_name, recipient.email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(recipientSearch.trim().toLowerCase()),
  )

  return (
    <div className="relative h-[calc(100vh-9rem)] min-h-[720px] overflow-hidden rounded-md border border-[#d8c79d]/50 bg-[#f8f4ec] shadow-panel">
      <div className="border-b border-panel bg-white px-4 py-3">
        <div>
          <h1 className="text-xl font-semibold text-heading">Inbox</h1>
          <div className="mt-2 flex flex-wrap gap-4" role="tablist" aria-label="Inbox sections">
            {([
              ["inbox", "All", unreadInboxCount],
              ["sent", "Sent", 0],
              ["archives", "Archives", 0],
              ["drafts", "Drafts", drafts.length],
              ["recentlyDeleted", "Recently Deleted", deletedThreads.length],
            ] as const).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={inboxTab === id}
                onClick={() => {
                  setInboxTab(id)
                  setSelectedThreadIds(new Set())
                }}
                className={`text-xs font-bold ${inboxTab === id ? "text-accent" : "text-muted"}`}
              >
                {label}{count > 0 ? ` (${count})` : ""}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {inboxTab !== "recentlyDeleted" && (
            <button
              type="button"
              onClick={() => {
                setComposerError("")
                setShowNewMessage(true)
              }}
              className="inline-flex items-center gap-2 rounded-md bg-[#1a3a2a] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#244f39]"
            >
              <IconPlus aria-hidden="true" className="h-4 w-4" />
              New message
            </button>
          )}
          {inboxTab !== "drafts" && (
            <>
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                disabled={selectableVisibleThreads.length === 0}
                className="rounded-md border border-panel bg-panel px-3 py-2 text-sm font-bold text-secondary transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
              >
                {allVisibleSelected ? "Clear selection" : "Select all"}
              </button>
              {inboxTab === "recentlyDeleted" ? (
                <button
                  type="button"
                  onClick={restoreSelectedThreads}
                  disabled={selectedVisibleCount === 0 || restoringSelected}
                  className="inline-flex items-center gap-2 rounded-md border border-[#c8a060]/50 bg-[#f8f4ec] px-3 py-2 text-sm font-bold text-[#1a3a2a] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {restoringSelected
                    ? "Restoring..."
                    : `Restore selected${selectedVisibleCount > 0 ? ` (${selectedVisibleCount})` : ""}`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={deleteSelectedThreads}
                  disabled={selectedVisibleCount === 0}
                  className="inline-flex items-center gap-2 rounded-md border border-rose-500/25 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconTrash aria-hidden="true" className="h-4 w-4" />
                  Delete selected{selectedVisibleCount > 0 ? ` (${selectedVisibleCount})` : ""}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {statusMessage && (
        <div role="status" className="absolute right-6 top-20 z-40 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm font-bold text-success shadow-panel">
          {statusMessage}
        </div>
      )}

      {inboxTab === "drafts" ? (
        <div className="h-[calc(100%-6.75rem)] overflow-y-auto bg-panel p-5">
          {drafts.length === 0 ? (
            <div className="rounded-md border border-panel bg-white p-8 text-center">
              <p className="text-sm font-semibold text-heading">No drafts in this session.</p>
              <p className="mt-2 text-xs text-muted">Drafts are kept only until you refresh or leave this browser session.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {drafts.map((draft) => (
                <article key={draft.id} className="rounded-md border border-panel bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
                        To {draft.recipientName}
                      </p>
                      <h2 className="mt-1 truncate text-sm font-bold text-heading">{draft.subject}</h2>
                      <p className="mt-2 line-clamp-2 text-sm text-muted">{draft.body || "No message body yet."}</p>
                      <p className="mt-2 text-[0.68rem] text-muted">Saved {relativeTime(draft.savedAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openDraft(draft)}
                      className="rounded-md border border-panel bg-panel px-3 py-2 text-sm font-bold text-secondary transition hover:bg-surface"
                    >
                      Continue draft
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
      <div className="grid h-[calc(100%-6.75rem)] min-h-0 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className={`min-h-0 border-r border-[#254d38] bg-[#1a3a2a] text-[#f8f4ec] ${
            screenMode === "conversation" ? "hidden lg:flex" : "flex"
          } flex-col`}
        >
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#f8f4ec]">
                {inboxTab === "sent"
                  ? "Sent messages"
                  : inboxTab === "archives"
                    ? "Archived conversations"
                    : inboxTab === "recentlyDeleted"
                      ? "Recently deleted"
                      : "Conversations"}
              </h2>
              <button
                type="button"
                onClick={() => setShowNotifications(true)}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/10 text-[#f8f4ec] xl:hidden"
                aria-label="Open notifications"
                title="Open notifications"
              >
                <IconBell aria-hidden="true" className="h-4 w-4" stroke={1.8} />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#c8a060]" />
                )}
              </button>
            </div>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search conversations..."
              className="mt-4 w-full rounded-md border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-[#f8f4ec] outline-none transition placeholder:text-white/45 focus:border-[#c8a060] focus:ring-1 focus:ring-[#c8a060]/40"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-md bg-card" />
                ))}
              </div>
            ) : visibleThreads.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm font-semibold text-heading">No conversations found.</p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  {inboxTab === "recentlyDeleted"
                    ? "Deleted conversations that can be restored will appear here."
                    : "Procurement messages and platform updates will appear here."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {visibleThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className={`flex w-full items-start gap-3 p-4 text-left transition hover:bg-white/10 ${
                      activeThread?.id === thread.id ? "bg-white/10" : ""
                    }`}
                  >
                    {!thread.platform && (
                      <input
                        type="checkbox"
                        checked={selectedThreadIds.has(thread.id)}
                        onChange={() => toggleThreadSelection(thread.id)}
                        className="mt-3 h-4 w-4 rounded border-white/30 bg-white/10 accent-[#c8a060]"
                        aria-label={`Select ${thread.senderName}`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => openThread(thread)}
                      className="flex min-w-0 flex-1 gap-3 text-left"
                    >
                    <ThreadAvatar thread={thread} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className={`truncate text-sm ${
                            thread.unread ? "font-bold text-[#f8f4ec]" : "font-semibold text-[#f8f4ec]/75"
                          }`}
                        >
                          {thread.senderName}
                        </span>
                        <span className="shrink-0 text-[0.65rem] text-[#f8f4ec]/55">
                          {relativeTime(thread.timestamp)}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#c8a060]">
                        {thread.contextType} - {thread.contextTitle}
                      </span>
                      <span
                        className={`mt-1 block truncate text-xs ${
                          thread.unread ? "font-bold text-[#f8f4ec]" : "text-[#f8f4ec]/55"
                        }`}
                      >
                        {thread.preview}
                      </span>
                    </span>
                    {thread.unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#c8a060]" />}
                    </button>
                    {inboxTab === "recentlyDeleted" && !thread.platform && (
                      <button
                        type="button"
                        disabled={restoringThreadIds.has(thread.id)}
                        onClick={() => restoreThread(thread)}
                        className="mt-1 rounded-md border border-[#c8a060]/50 bg-[#f8f4ec] px-3 py-2 text-xs font-bold text-[#1a3a2a] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {restoringThreadIds.has(thread.id) ? "Restoring..." : "Restore"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section
          className={`min-h-0 ${
            screenMode === "threads" ? "hidden lg:flex" : "flex"
          } flex-col bg-[#f8f4ec]`}
        >
          {activeThread ? (
            <>
              <div className="border-b border-[#d8c79d]/50 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <button
                      type="button"
                      onClick={() => setScreenMode("threads")}
                      className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#d8c79d]/50 bg-[#f8f4ec] text-[#1a3a2a] lg:hidden"
                      aria-label="Back to conversations"
                    >
                      <IconArrowLeft aria-hidden="true" className="h-4 w-4" stroke={1.8} />
                    </button>
                    <ThreadAvatar thread={activeThread} />
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-heading">
                        {activeThread.senderName}
                      </h2>
                      <p className="mt-1 truncate text-xs font-bold uppercase tracking-[0.16em] text-accent">
                        {activeThread.contextType} - {activeThread.contextTitle} - {activeThread.buyerOrg}
                      </p>
                      {showDeadlineWarning && (
                        <p className="mt-2 text-xs font-bold text-warning">
                          Closes in {deadlineDays} day{deadlineDays === 1 ? "" : "s"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {relatedDocumentHref && (
                      <Link
                        href={relatedDocumentHref}
                        target="_blank"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d8c79d]/50 bg-[#f8f4ec] text-[#1a3a2a] transition hover:border-[#c8a060] hover:bg-white"
                        aria-label={documentLabel(activeThread)}
                        title={documentLabel(activeThread)}
                      >
                        <IconFile aria-hidden="true" className="h-4 w-4" stroke={1.8} />
                      </Link>
                    )}
                    <Link
                      href={conversationHref(activeThread)}
                      target="_blank"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d8c79d]/50 bg-[#f8f4ec] text-[#1a3a2a] transition hover:border-[#c8a060] hover:bg-white"
                      aria-label="Open conversation in new tab"
                      title="Open conversation in new tab"
                    >
                      <IconExternalLink aria-hidden="true" className="h-4 w-4" stroke={1.8} />
                    </Link>
                    {inboxTab === "recentlyDeleted" && !activeThread.platform ? (
                      <button
                        type="button"
                        disabled={restoringThreadIds.has(activeThread.id)}
                        onClick={() => restoreThread(activeThread)}
                        className="inline-flex h-10 items-center justify-center rounded-md border border-[#c8a060]/50 bg-[#f8f4ec] px-3 text-sm font-bold text-[#1a3a2a] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {restoringThreadIds.has(activeThread.id) ? "Restoring..." : "Restore"}
                      </button>
                    ) : (
                      <>
                        <IconButton label="Archive conversation" onClick={archiveActiveThread}>
                          <IconArchive aria-hidden="true" className="h-4 w-4" stroke={1.8} />
                        </IconButton>
                        {!activeThread.platform && (
                          <IconButton label="Remove conversation" onClick={deleteActiveThread}>
                            <IconTrash aria-hidden="true" className="h-4 w-4" stroke={1.8} />
                          </IconButton>
                        )}
                        <IconButton label="Mark unread" onClick={markActiveUnread}>
                          <IconMail aria-hidden="true" className="h-4 w-4" stroke={1.8} />
                        </IconButton>
                      </>
                    )}
                  </div>
                </div>

                {!activeThread.platform && (
                  <div className="mt-4 rounded-md border border-[#d8c79d]/60 bg-[#f8f4ec] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-secondary">
                          {activeThread.contextType} context
                        </p>
                        <h3 className="mt-1 text-sm font-bold text-heading">
                          {activeThread.contextTitle}
                        </h3>
                        <p className="mt-2 text-xs leading-5 text-muted">
                          {[
                            activeThread.buyerOrg,
                            activeThread.province,
                            activeThread.deadline ? `Deadline ${longDate(activeThread.deadline)}` : null,
                            activeThread.value,
                          ]
                            .filter(Boolean)
                            .join(" - ")}
                        </p>
                      </div>
                      {relatedDocumentHref && (
                        <Link
                          href={relatedDocumentHref}
                          className="text-sm font-bold text-accent transition hover:text-accent-strong"
                        >
                          {documentLabel(activeThread)} -&gt;
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="border-b border-rose-500/25 bg-rose-500/10 px-5 py-3">
                  <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
                </div>
              )}

              <div
                key={activeThread.id}
                ref={feedRef}
                className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#f8f4ec] p-5"
              >
                <p className="text-center text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
                  Conversation started {longDate(activeThread.messages[0]?.created_at ?? null)} when{" "}
                  {activeThread.messages[0]?.subject || "the procurement thread was opened"}
                </p>

                {activeThread.messages.map((message, index) => {
                  const previous = activeThread.messages[index - 1]
                  const next = activeThread.messages[index + 1]
                  const startsGroup = !previous || previous.sender_id !== message.sender_id
                  const endsGroup = !next || next.sender_id !== message.sender_id

                  return (
                    <div
                      key={`${activeThread.id}-${message.id}`}
                      className={`flex ${message.mine ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[82%] ${message.mine ? "items-end" : "items-start"}`}>
                        {startsGroup && !message.mine && (
                          <p className="mb-1 text-xs font-bold text-secondary">
                            {activeThread.senderName} - {activeThread.senderOrg}
                          </p>
                        )}
                        <div
                          className={`rounded-md px-4 py-3 text-sm leading-6 shadow-sm ${
                            message.mine
                              ? "bg-[#1a3a2a] text-[#f8f4ec]"
                              : "border border-[#d8c79d]/60 bg-white text-heading"
                          }`}
                        >
                          <FormattedMessageText text={message.message} />
                        </div>
                        {message.attachments?.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.href ?? "#"}
                            className="mt-2 flex items-center gap-2 rounded-md border border-panel bg-card px-3 py-2 text-xs font-semibold text-heading"
                          >
                            <IconFile aria-hidden="true" className="h-4 w-4 shrink-0" stroke={1.8} />
                            <span className="truncate">{attachment.name}</span>
                            <span className="text-muted">{attachment.size}</span>
                          </a>
                        ))}
                        {endsGroup && (
                          <p className={`mt-1 text-[0.68rem] text-muted ${message.mine ? "text-right" : ""}`}>
                            {formatMessageTime(message.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {!activeThread.platform && (
                <form onSubmit={handleSend} className="border-t border-[#d8c79d]/50 bg-white p-4">
                  {pendingFiles.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {pendingFiles.map((file) => (
                        <span
                          key={file.id}
                          className="rounded-md border border-panel bg-panel px-3 py-1.5 text-xs font-semibold text-secondary"
                        >
                          {file.name} - {file.size}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative mb-2 flex items-center gap-1" aria-label="Message formatting">
                    <button type="button" onClick={() => formatComposerSelection("reply", "**")} className="rounded p-2 text-secondary hover:bg-panel" aria-label="Bold">
                      <IconBold className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => formatComposerSelection("reply", "*")} className="rounded p-2 text-secondary hover:bg-panel" aria-label="Italic">
                      <IconItalic className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setEmojiPickerTarget((current) => current === "reply" ? null : "reply")} className="rounded p-2 text-secondary hover:bg-panel" aria-label="Add emoji">
                      <IconMoodSmile className="h-4 w-4" />
                    </button>
                    {emojiPickerTarget === "reply" && (
                      <div className="absolute bottom-10 left-16 z-10 flex gap-1 rounded-md border border-panel bg-white p-2 shadow-panel">
                        {MESSAGE_EMOJIS.map((emoji) => (
                          <button key={emoji} type="button" onClick={() => { insertComposerText("reply", emoji); setEmojiPickerTarget(null) }} className="rounded p-1.5 text-lg hover:bg-panel" aria-label={`Add ${emoji}`}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-end gap-3 rounded-md border border-[#d8c79d]/60 bg-[#f8f4ec] p-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      onChange={(event) => handleFiles(event.target.files)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#d8c79d]/50 bg-white text-[#1a3a2a] transition hover:border-[#c8a060]"
                      aria-label="Attach files"
                      title="Attach files"
                    >
                      <IconPaperclip aria-hidden="true" className="h-4 w-4" stroke={1.8} />
                    </button>
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder={`Reply to ${activeThread.senderName}...`}
                      className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-heading outline-none placeholder:text-muted"
                    />
                    <button
                      type="submit"
                      disabled={sending || !replyText.trim()}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#1a3a2a] bg-[#1a3a2a] text-[#f8f4ec] transition hover:bg-[#244f39] disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Send message"
                      title="Send message"
                    >
                      <IconSend aria-hidden="true" className="h-4 w-4" stroke={1.8} />
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div>
                <p className="text-sm font-semibold text-heading">Select a conversation.</p>
                <p className="mt-2 text-xs text-muted">Messages will open here.</p>
              </div>
            </div>
          )}
        </section>

      </div>
      )}

      {showNotifications && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="ml-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-md border border-panel bg-panel shadow-panel">
            <div className="flex justify-end border-b border-panel p-3">
              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="rounded-md border border-panel bg-card px-3 py-2 text-xs font-bold text-heading"
              >
                Close
              </button>
            </div>
            <NotificationsPanel
              notifications={visibleNotifications}
              notificationTab={notificationTab}
              unreadCount={unreadNotificationCount}
              onTabChange={setNotificationTab}
              onOpen={handleNotificationClick}
              onMarkAllRead={markAllNotificationsRead}
            />
          </div>
        </div>
      )}

      {showNewMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="new-message-title">
          <form onSubmit={handleNewMessage} className="w-full max-w-xl rounded-lg border border-panel bg-white p-6 shadow-panel">
            <div className="flex items-center justify-between">
              <h2 id="new-message-title" className="text-xl font-semibold text-heading">New message</h2>
              <button type="button" onClick={saveNewMessageDraft} aria-label="Save draft and close composer" className="rounded-md p-2 text-muted hover:bg-panel">
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-5 block text-sm font-bold text-heading">
              Recipient
              <input
                value={recipientSearch}
                onChange={(event) => {
                  setRecipientSearch(event.target.value)
                  setNewRecipientId("")
                }}
                placeholder="Search by business or contact name"
                className="mt-2 w-full rounded-md border border-panel px-3 py-2.5 font-normal outline-none focus:border-accent"
              />
            </label>
            {recipientSearch && !newRecipientId && (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-panel">
                {matchingRecipients.length ? matchingRecipients.slice(0, 20).map((recipient) => (
                  <button
                    key={recipient.id}
                    type="button"
                    onClick={() => {
                      setNewRecipientId(recipient.id)
                      setRecipientSearch(profileName(recipient))
                    }}
                    className="block w-full border-b border-panel px-3 py-2.5 text-left last:border-0 hover:bg-surface"
                  >
                    <span className="block text-sm font-bold text-heading">{profileName(recipient)}</span>
                    <span className="text-xs text-muted">{recipient.role}</span>
                  </button>
                )) : <p className="p-3 text-sm text-muted">No eligible recipients found.</p>}
              </div>
            )}
            <label className="mt-4 block text-sm font-bold text-heading">
              Subject
              <input value={newSubject} onChange={(event) => setNewSubject(event.target.value)} maxLength={160} className="mt-2 w-full rounded-md border border-panel px-3 py-2.5 font-normal outline-none focus:border-accent" />
            </label>
            <div className="mt-4">
              <label htmlFor="new-message-body" className="block text-sm font-bold text-heading">
                Message
              </label>
              <div className="relative mt-2 flex items-center gap-1 rounded-t-md border border-b-0 border-panel bg-panel px-2 py-1" aria-label="Message formatting">
                <button type="button" onClick={() => formatComposerSelection("new", "**")} className="rounded p-2 text-secondary hover:bg-white" aria-label="Bold">
                  <IconBold className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => formatComposerSelection("new", "*")} className="rounded p-2 text-secondary hover:bg-white" aria-label="Italic">
                  <IconItalic className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setEmojiPickerTarget((current) => current === "new" ? null : "new")} className="rounded p-2 text-secondary hover:bg-white" aria-label="Add emoji">
                  <IconMoodSmile className="h-4 w-4" />
                </button>
                {emojiPickerTarget === "new" && (
                  <div className="absolute left-16 top-11 z-10 flex gap-1 rounded-md border border-panel bg-white p-2 shadow-panel">
                    {MESSAGE_EMOJIS.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => { insertComposerText("new", emoji); setEmojiPickerTarget(null) }} className="rounded p-1.5 text-lg hover:bg-panel" aria-label={`Add ${emoji}`}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <textarea id="new-message-body" ref={newMessageTextareaRef} value={newBody} onChange={(event) => setNewBody(event.target.value)} rows={6} className="w-full resize-y rounded-b-md border border-panel px-3 py-2.5 font-normal outline-none focus:border-accent" />
            </div>
            {composerError && (
              <p role="alert" className="mt-3 rounded-md border border-rose-500/25 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {composerError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowNewMessage(false)} className="rounded-md border border-panel px-4 py-2.5 text-sm font-bold text-secondary">Discard</button>
              <button type="button" onClick={saveNewMessageDraft} className="rounded-md border border-panel bg-panel px-4 py-2.5 text-sm font-bold text-secondary">Save draft</button>
              <button type="submit" disabled={sending || !newRecipientId || !newSubject.trim() || !newBody.trim()} className="rounded-md bg-[#1a3a2a] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {sending ? "Sending..." : "Send message"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function NotificationsPanel({
  notifications,
  notificationTab,
  unreadCount,
  onTabChange,
  onOpen,
  onMarkAllRead,
}: {
  notifications: Notification[]
  notificationTab: NotificationTab
  unreadCount: number
  onTabChange: (tab: NotificationTab) => void
  onOpen: (notification: Notification) => void
  onMarkAllRead: () => void
}) {
  return (
    <>
      <div className="border-b border-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-heading">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-[0.65rem] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-xs font-bold text-accent transition hover:text-accent-strong"
          >
            Mark all read
          </button>
        </div>
        <div className="mt-4 grid grid-cols-3 rounded-md border border-panel bg-card p-1">
          {[
            { id: "all" as const, label: "All" },
            { id: "action" as const, label: "Action needed" },
            { id: "updates" as const, label: "Updates" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`rounded px-2 py-2 text-[0.68rem] font-bold transition ${
                notificationTab === tab.id
                  ? "bg-surface text-heading shadow-sm"
                  : "text-secondary hover:text-heading"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-heading">No notifications yet.</p>
            <p className="mt-2 text-xs text-muted">Procurement alerts will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-panel">
            {notifications.map((notification) => {
              const actionLabel = notificationActionLabel(notification)

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => onOpen(notification)}
                  className={`flex w-full gap-3 p-4 text-left transition hover:bg-surface ${
                    notification.read ? "" : "bg-surface/70"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${notificationTone(
                      notification.type,
                    )}`}
                  >
                    N
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-xs font-bold text-heading">
                      {notification.title}
                    </span>
                    <span className="mt-1 line-clamp-2 text-[0.68rem] leading-5 text-muted">
                      {notification.message}
                    </span>
                    <span className="mt-2 block text-[0.62rem] text-muted">
                      {relativeTime(notification.created_at)}
                    </span>
                    {actionLabel && (
                      <span className="mt-2 block text-xs font-bold text-accent">
                        {actionLabel}
                      </span>
                    )}
                  </span>
                  {!notification.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

