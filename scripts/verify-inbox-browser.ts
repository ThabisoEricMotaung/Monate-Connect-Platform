import { createClient } from "@supabase/supabase-js"
import puppeteer from "puppeteer"
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"

for (const file of [".env.local", ".env"]) {
  const envPath = path.resolve(process.cwd(), file)
  if (!fs.existsSync(envPath)) continue
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const separatorIndex = trimmed.indexOf("=")
    if (separatorIndex === -1) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    if (!key || process.env[key] != null) continue
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "")
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const appUrl = process.env.INBOX_VERIFY_APP_URL ?? "http://127.0.0.1:3006"
const shouldStartServer = process.env.INBOX_VERIFY_START_SERVER === "1"
const serverPort = new URL(appUrl).port || "3006"

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Missing Supabase credentials.")
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function logStage(stage: string) {
  console.log(`[verify-inbox-browser] ${stage}`)
}

async function login(page: import("puppeteer").Page, email: string, password: string) {
  await page.goto(`${appUrl}/auth/login`, { waitUntil: "networkidle2" })
  await page.type('input[type="email"]', email)
  await page.type('input[type="password"]', password)
  await page.evaluate(() => {
    const loginButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Log in",
    )
    if (!(loginButton instanceof HTMLButtonElement)) throw new Error("Log in button not found.")
    loginButton.click()
  })
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 45_000 }).catch(() => undefined)
}

async function waitForApp() {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    try {
      const response = await fetch(appUrl)
      if (response.ok) return
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }
  throw new Error(`App did not become ready at ${appUrl}.`)
}

async function cleanupStaleBrowserData() {
  await admin.from("messages").delete().like("subject", "Codex browser inbox %")
  await admin.from("notifications").delete().like("title", "Codex browser notification %")
  await admin.from("profiles").delete().like("email", "codex-browser-%@example.com")

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error

  const staleUsers = data.users.filter((user) => user.email?.startsWith("codex-browser-"))
  for (const user of staleUsers) {
    await admin.auth.admin.deleteUser(user.id)
  }
}

async function main() {
  let serverProcess: ChildProcessWithoutNullStreams | null = null
  if (shouldStartServer) {
    logStage(`starting Next server on ${appUrl}`)
    serverProcess = spawn(
      "cmd.exe",
      ["/c", "npx.cmd", "next", "start", "--hostname", "127.0.0.1", "--port", serverPort],
      { cwd: process.cwd(), stdio: "pipe" },
    )
    serverProcess.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`))
    serverProcess.stderr.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`))
  }
  await waitForApp()
  logStage("app is ready")
  logStage("cleaning stale disposable browser data")
  await cleanupStaleBrowserData()

  const stamp = Date.now()
  const password = `InboxBrowser-${stamp}!`
  const recipientEmail = `codex-browser-recipient-${stamp}@example.com`
  const senderEmail = `codex-browser-sender-${stamp}@example.com`
  const subjects = [1, 2, 3].map((index) => `Codex browser inbox ${stamp}-${index}`)
  const createdUserIds: string[] = []
  let messageIds: number[] = []
  let notificationIds: number[] = []
  const browser = await puppeteer.launch({ headless: true })

  try {
    logStage("creating disposable users and messages")
    const recipient = await admin.auth.admin.createUser({
      email: recipientEmail,
      password,
      email_confirm: true,
      user_metadata: { business_name: "Codex Browser Recipient", role: "buyer" },
    })
    if (recipient.error || !recipient.data.user) throw recipient.error ?? new Error("Recipient create failed.")
    createdUserIds.push(recipient.data.user.id)

    const sender = await admin.auth.admin.createUser({
      email: senderEmail,
      password,
      email_confirm: true,
      user_metadata: { business_name: "Codex Browser Sender", role: "supplier" },
    })
    if (sender.error || !sender.data.user) throw sender.error ?? new Error("Sender create failed.")
    createdUserIds.push(sender.data.user.id)

    const { error: profileError } = await admin.from("profiles").upsert([
      {
        id: recipient.data.user.id,
        email: recipientEmail,
        business_name: "Codex Browser Recipient",
        full_name: "Codex Browser Recipient",
        role: "buyer",
        phone_verified_at: new Date().toISOString(),
      },
      {
        id: sender.data.user.id,
        email: senderEmail,
        business_name: "Codex Browser Sender",
        full_name: "Codex Browser Sender",
        role: "supplier",
        phone_verified_at: new Date().toISOString(),
      },
    ])
    if (profileError) throw profileError

    const { data: insertedMessages, error: messageError } = await admin
      .from("messages")
      .insert([
        ...subjects.map((subject) => ({
          sender_id: sender.data.user.id,
          receiver_id: recipient.data.user.id,
          subject,
          message: `Inbound browser verification for ${subject}`,
          is_read: false,
        })),
        ...subjects.map((subject) => ({
          sender_id: recipient.data.user.id,
          receiver_id: sender.data.user.id,
          subject,
          message: `Recipient reply that used to resurrect ${subject}`,
          is_read: false,
        })),
      ])
      .select("id")
    if (messageError) throw messageError
    messageIds = (insertedMessages ?? []).map((row) => row.id as number)

    const { data: insertedNotifications, error: notificationError } = await admin
      .from("notifications")
      .insert([1, 2, 3].map((index) => ({
        user_id: recipient.data.user.id,
        type: "Message Received",
        title: `Codex browser notification ${stamp}-${index}`,
        message: `Browser verification notification ${index}`,
        is_read: false,
      })))
      .select("id")
    if (notificationError) throw notificationError
    notificationIds = (insertedNotifications ?? []).map((row) => row.id as number)

    const page = await browser.newPage()
    page.on("dialog", (dialog) => dialog.accept())
    await page.setViewport({ width: 1440, height: 1100 })
    logStage("logging in")
    await login(page, recipientEmail, password)
    await page.goto(`${appUrl}/dashboard/messages`, { waitUntil: "networkidle2" })
    await page.waitForFunction(() => document.body.innerText.includes("Inbox (3)"), { timeout: 45_000 })

    logStage("checking separated message and notification counts")
    await new Promise((resolve) => setTimeout(resolve, 1_000))

    const countObservation = await page.evaluate(() => ({
      bell: document.querySelector('button[aria-label^="Notifications"]')?.getAttribute("aria-label") ?? "",
      tabs: Array.from(document.querySelectorAll('[role="tab"]')).map((tab) => tab.textContent?.trim() ?? ""),
    }))

    await page.evaluate(() => {
      const bell = document.querySelector('button[aria-label^="Notifications"]')
      if (!(bell instanceof HTMLButtonElement)) throw new Error("Notifications bell not found.")
      bell.click()
    })
    await page.waitForFunction(() => document.body.innerText.includes("Codex browser notification"), { timeout: 20_000 })
    const notificationPanelObservation = await page.evaluate(() => ({
      bodyHasPanelNotification: document.body.innerText.includes("Codex browser notification"),
      bodyHasNotificationUnreadCount: document.body.innerText.includes("Unread (3)"),
    }))
    await page.evaluate(() => {
      const closeButton = Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.trim() === "Close",
      )
      if (closeButton instanceof HTMLButtonElement) closeButton.click()
    })

    await page.evaluate(() => {
      const inboxTab = Array.from(document.querySelectorAll('[role="tab"]')).find((tab) =>
        tab.textContent?.includes("Inbox"),
      )
      if (!(inboxTab instanceof HTMLButtonElement)) throw new Error("Inbox tab not found.")
      inboxTab.click()
    })
    await page.waitForFunction((subject) => document.body.innerText.includes(subject as string), { timeout: 20_000 }, subjects[0])

    logStage("bulk deleting conversations in browser")
    await page.evaluate(() => {
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]')).slice(0, 3)
      if (checkboxes.length < 3) throw new Error(`Expected at least 3 checkboxes, found ${checkboxes.length}.`)
      checkboxes.forEach((checkbox) => {
        if (checkbox instanceof HTMLInputElement && !checkbox.checked) checkbox.click()
      })
    })
    const deleteButtonText = await page.evaluate(() => {
      const deleteSelected = Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Delete selected"),
      )
      return deleteSelected?.textContent?.trim() ?? ""
    })
    await page.evaluate(() => {
      const deleteSelected = Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Delete selected"),
      )
      if (!(deleteSelected instanceof HTMLButtonElement)) throw new Error("Delete selected button not found.")
      deleteSelected.click()
    })
    await page.waitForFunction(() => document.body.innerText.includes("conversations removed"), { timeout: 20_000 })
    const afterDeleteTextBeforeReload = await page.evaluate(() => document.body.innerText)
    const visibleSubjectsImmediatelyAfterDelete = subjects.filter((subject) => afterDeleteTextBeforeReload.includes(subject))
    await page.reload({ waitUntil: "networkidle2" })
    await page.waitForSelector('[role="tab"]', { timeout: 45_000 })
    await new Promise((resolve) => setTimeout(resolve, 1_000))

    const afterReloadText = await page.evaluate(() => document.body.innerText)
    const reappearedSubjects = subjects.filter((subject) => afterReloadText.includes(subject))
    const { data: deletedRowsAfterDelete, error: deletedRowsAfterDeleteError } = await admin
      .from("messages")
      .select("subject,deleted_by_sender,deleted_by_receiver")
      .in("id", messageIds)

    if (deletedRowsAfterDeleteError) throw deletedRowsAfterDeleteError

    logStage("checking Recently Deleted")
    await page.evaluate(() => {
      const deletedTab = Array.from(document.querySelectorAll('[role="tab"]')).find((tab) =>
        tab.textContent?.includes("Recently Deleted"),
      )
      if (!(deletedTab instanceof HTMLButtonElement)) throw new Error("Recently Deleted tab not found.")
      deletedTab.click()
    })
    await page.waitForFunction((subject) => document.body.innerText.includes(subject as string), { timeout: 20_000 }, subjects[0])
    const recentlyDeletedText = await page.evaluate(() => document.body.innerText)
    const tabsAfterDelete = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="tab"]')).map((tab) => tab.textContent?.trim() ?? ""),
    )
    const recentlyDeletedSubjects = subjects.filter((subject) => recentlyDeletedText.includes(subject))
    const restoredSubject = recentlyDeletedSubjects[0]
    if (!restoredSubject) throw new Error("No deleted subject was visible before restore.")

    logStage(`restoring ${restoredSubject}`)
    const cdpSession = await page.createCDPSession()
    await cdpSession.send("Network.enable")
    await cdpSession.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 600,
      downloadThroughput: 40_000,
      uploadThroughput: 20_000,
    })
    await page.evaluate(() => {
      const restoreButton = Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.trim() === "Restore",
      )
      if (!(restoreButton instanceof HTMLButtonElement)) throw new Error("Restore button not found.")
      restoreButton.click()
    })
    const sawRestoringState = await page
      .waitForFunction(() => document.body.innerText.includes("Restoring..."), { timeout: 5_000 })
      .then(() => true)
      .catch(() => false)
    await cdpSession.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: 10_000_000,
      uploadThroughput: 10_000_000,
    })
    await page.waitForFunction(() => document.body.innerText.includes("Conversation restored to Inbox."), { timeout: 20_000 })

    const afterRestoreDeletedText = await page.evaluate(() => document.body.innerText)
    const tabsAfterRestore = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="tab"]')).map((tab) => ({
        text: tab.textContent?.trim() ?? "",
        selected: tab.getAttribute("aria-selected"),
      })),
    )
    const stayedInRecentlyDeleted =
      tabsAfterRestore.some((tab) => tab.text.startsWith("Recently Deleted") && tab.selected === "true") &&
      !afterRestoreDeletedText.includes(restoredSubject)

    await page.evaluate(() => {
      const inboxTab = Array.from(document.querySelectorAll('[role="tab"]')).find((tab) =>
        tab.textContent?.includes("Inbox"),
      )
      if (!(inboxTab instanceof HTMLButtonElement)) throw new Error("Inbox tab not found after restore.")
      inboxTab.click()
    })
    await page.waitForFunction((subject) => document.body.innerText.includes(subject as string), { timeout: 20_000 }, restoredSubject)
    const restoredInboxText = await page.evaluate(() => document.body.innerText)
    const restoredHasFullHistory =
      restoredInboxText.includes(restoredSubject) &&
      restoredInboxText.includes(`Inbound browser verification for ${restoredSubject}`) &&
      restoredInboxText.includes(`Recipient reply that used to resurrect ${restoredSubject}`)

    const { data: senderVisibleRows, error: senderVisibleError } = await admin
      .from("messages")
      .select("id")
      .in("id", messageIds)
      .or(
        [
          `and(sender_id.eq.${sender.data.user.id},deleted_by_sender.is.null)`,
          `and(sender_id.eq.${sender.data.user.id},deleted_by_sender.eq.false)`,
          `and(receiver_id.eq.${sender.data.user.id},deleted_by_receiver.is.null)`,
          `and(receiver_id.eq.${sender.data.user.id},deleted_by_receiver.eq.false)`,
        ].join(","),
      )

    if (senderVisibleError) throw senderVisibleError

    const result = {
      countObservation,
      notificationPanelObservation,
      deletedSubjects: subjects,
      deleteButtonText,
      visibleSubjectsImmediatelyAfterDelete,
      deletedRowsAfterDelete,
      reappearedSubjects,
      tabsAfterDelete,
      recentlyDeletedSubjects,
      restoredSubject,
      sawRestoringState,
      stayedInRecentlyDeleted,
      restoredHasFullHistory,
      otherPartyVisibleRowsAfterDeleteAndRestore: senderVisibleRows?.length ?? 0,
      pass:
        countObservation.bell.includes("3 unread") &&
        countObservation.tabs.includes("Inbox (3)") &&
        !countObservation.tabs.some((tab) => tab.includes("Notifications")) &&
        notificationPanelObservation.bodyHasPanelNotification &&
        notificationPanelObservation.bodyHasNotificationUnreadCount &&
        deleteButtonText === "Delete selected (3)" &&
        visibleSubjectsImmediatelyAfterDelete.length === 0 &&
        reappearedSubjects.length === 0 &&
        tabsAfterDelete.includes("Recently Deleted (3)") &&
        recentlyDeletedSubjects.length > 0 &&
        sawRestoringState &&
        stayedInRecentlyDeleted &&
        restoredHasFullHistory &&
        (senderVisibleRows?.length ?? 0) === messageIds.length,
    }

    console.log(JSON.stringify(result, null, 2))
    if (!result.pass) throw new Error(`Browser inbox verification failed.\n${JSON.stringify(result, null, 2)}`)
  } finally {
    logStage("cleaning up disposable data")
    await browser.close()
    if (messageIds.length) await admin.from("messages").delete().in("id", messageIds)
    if (notificationIds.length) await admin.from("notifications").delete().in("id", notificationIds)
    for (const userId of createdUserIds) {
      await admin.from("profiles").delete().eq("id", userId)
      await admin.auth.admin.deleteUser(userId)
    }
    if (serverProcess && !serverProcess.killed) {
      if (serverProcess.pid) {
        spawnSync("taskkill", ["/pid", String(serverProcess.pid), "/T", "/F"], { stdio: "ignore" })
      } else {
        serverProcess.kill()
      }
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
