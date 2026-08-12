import { createClient } from "@supabase/supabase-js"
import puppeteer, { type Page } from "puppeteer"
import { spawn, type ChildProcess } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"

// --- env loading (same boilerplate as scripts/verify-inbox-browser.ts) --------
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
const appUrl = process.env.SMOKE_RFQ_APP_URL ?? "http://127.0.0.1:3000"
const serverPort = new URL(appUrl).port || "3000"

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Missing Supabase credentials.")
}

// Re-bind as non-nullable module-level consts: TypeScript's control-flow narrowing above does
// not carry into closures (e.g. inside main()) defined later in this file.
const SUPABASE_URL: string = supabaseUrl
const ANON_KEY: string = anonKey
const SERVICE_ROLE_KEY: string = serviceRoleKey

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function logStage(stage: string) {
  console.log(`[smoke-rfq] ${stage}`)
}

async function isAppUp(): Promise<boolean> {
  try {
    await fetch(appUrl)
    return true
  } catch {
    return false
  }
}

async function waitForApp() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      const response = await fetch(appUrl)
      if (response.ok || response.status < 500) return
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000))
  }
  throw new Error(`App did not become ready at ${appUrl}.`)
}

async function login(page: Page, email: string, password: string) {
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

async function switchUser(page: Page, email: string, password: string) {
  // Fully clear the previous persona's session (cookies + storage) before logging in as
  // a different persona in the same browser tab. The app uses @supabase/ssr's cookie-based
  // session, so localStorage alone is not enough.
  const cookies = await page.cookies().catch(() => [])
  if (cookies.length) await page.deleteCookie(...cookies).catch(() => undefined)
  await page
    .evaluate(() => {
      try {
        localStorage.clear()
      } catch {
        /* ignore */
      }
      try {
        sessionStorage.clear()
      } catch {
        /* ignore */
      }
    })
    .catch(() => undefined)
  await login(page, email, password)
}

async function clearAndType(page: Page, selector: string, text: string) {
  // Several fields on this app are pre-filled asynchronously from the signed-in user's own
  // profile (e.g. buyer organisation / contact person / contact email default to the admin's
  // own profile). page.type() appends to existing text rather than replacing it, so select-all
  // and delete first to avoid ending up with duplicated/invalid concatenated values.
  await page.click(selector, { count: 3 })
  await page.keyboard.press("Backspace")
  await page.type(selector, text)
}

async function clickButtonByText(page: Page, text: string, exact = true) {
  await page.evaluate(
    (targetText: string, isExact: boolean) => {
      const button = Array.from(document.querySelectorAll("button")).find((candidate) =>
        isExact ? candidate.textContent?.trim() === targetText : candidate.textContent?.includes(targetText),
      )
      if (!(button instanceof HTMLButtonElement)) throw new Error(`Button "${targetText}" not found.`)
      button.click()
    },
    text,
    exact,
  )
}

async function toggleCheckboxByLabelText(page: Page, labelText: string) {
  await page.evaluate((targetText: string) => {
    const label = Array.from(document.querySelectorAll("label")).find((candidate) =>
      candidate.textContent?.includes(targetText),
    )
    if (!label) throw new Error(`Label "${targetText}" not found.`)
    const checkbox = label.querySelector('input[type="checkbox"]')
    if (!(checkbox instanceof HTMLInputElement)) throw new Error(`Checkbox for "${targetText}" not found.`)
    checkbox.click()
  }, labelText)
}

async function clickButtonInRowByText(page: Page, rowText: string, buttonText: string) {
  await page.evaluate(
    (targetRowText: string, targetButtonText: string) => {
      const rows = Array.from(document.querySelectorAll("tbody tr"))
      const row = rows.find((candidate) => candidate.textContent?.includes(targetRowText))
      if (!row) throw new Error(`Table row containing "${targetRowText}" not found.`)
      const button = Array.from(row.querySelectorAll("button")).find((candidate) =>
        candidate.textContent?.includes(targetButtonText),
      )
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error(`Button "${targetButtonText}" not found in row containing "${targetRowText}".`)
      }
      button.click()
    },
    rowText,
    buttonText,
  )
}

async function setDateInputValue(page: Page, selector: string, value: string) {
  await page.evaluate(
    (targetSelector: string, targetValue: string) => {
      const input = document.querySelector(targetSelector)
      if (!(input instanceof HTMLInputElement)) throw new Error(`Date input "${targetSelector}" not found.`)
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      setter?.call(input, targetValue)
      input.dispatchEvent(new Event("input", { bubbles: true }))
      input.dispatchEvent(new Event("change", { bubbles: true }))
    },
    selector,
    value,
  )
}

function futureDateString(daysAhead: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return date.toISOString().slice(0, 10)
}

async function main() {
  const report: Record<string, unknown> = {}

  let serverProcess: ChildProcess | null = null
  const alreadyUp = await isAppUp()
  if (alreadyUp) {
    logStage(`app already running at ${appUrl}; reusing it`)
  } else {
    logStage(`no app detected at ${appUrl}; starting "next dev" (detached, will keep running after this script exits)`)
    serverProcess = spawn(
      "cmd.exe",
      ["/c", "npx.cmd", "next", "dev", "--hostname", "127.0.0.1", "--port", serverPort],
      { cwd: process.cwd(), stdio: "ignore", detached: true },
    )
    serverProcess.unref()
  }
  await waitForApp()
  logStage("app is ready")

  const stamp = Date.now()
  const password = `SmokeRFQ-${stamp}!`
  const adminEmail = `smoke-test-admin-${stamp}@example.com`
  const supplierAEmail = `smoke-test-supplier-a-${stamp}@example.com`
  const supplierBEmail = `smoke-test-supplier-b-${stamp}@example.com`
  const rfqTitle = `[SMOKE TEST] Supply of PPE equipment ${stamp}`
  const closingDateStr = futureDateString(20)

  report.stamp = stamp
  report.startedServer = !alreadyUp
  report.serverPid = serverProcess?.pid ?? null

  const browser = await puppeteer.launch({ headless: true })

  try {
    // --- Create disposable accounts (service-role, bypassing email confirmation) ---
    logStage("creating disposable admin + supplier accounts")

    const adminUser = await admin.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: { business_name: "Smoke Test Admin", role: "admin" },
    })
    if (adminUser.error || !adminUser.data.user) throw adminUser.error ?? new Error("Admin account creation failed.")

    const supplierA = await admin.auth.admin.createUser({
      email: supplierAEmail,
      password,
      email_confirm: true,
      user_metadata: { business_name: "Smoke Test Supplier A", role: "supplier" },
    })
    if (supplierA.error || !supplierA.data.user) throw supplierA.error ?? new Error("Supplier A creation failed.")

    const supplierB = await admin.auth.admin.createUser({
      email: supplierBEmail,
      password,
      email_confirm: true,
      user_metadata: { business_name: "Smoke Test Supplier B", role: "supplier" },
    })
    if (supplierB.error || !supplierB.data.user) throw supplierB.error ?? new Error("Supplier B creation failed.")

    const nowIso = new Date().toISOString()
    const { error: profileError } = await admin.from("profiles").upsert([
      {
        id: adminUser.data.user.id,
        email: adminEmail,
        business_name: "Smoke Test Admin",
        full_name: "Smoke Test Admin",
        role: "admin",
        phone_verified_at: nowIso,
        registration_status: "complete",
        verification_status: "Verified",
      },
      {
        id: supplierA.data.user.id,
        email: supplierAEmail,
        business_name: "Smoke Test Supplier A",
        full_name: "Smoke Test Supplier A",
        role: "supplier",
        phone: "+27110000101",
        phone_verified_at: nowIso,
        registration_status: "complete",
        verification_status: "Verified",
        csd_number: "CSD-SMOKE-A",
        bbbee_level: "Level 4",
        tax_status: "VAT registered",
      },
      {
        id: supplierB.data.user.id,
        email: supplierBEmail,
        business_name: "Smoke Test Supplier B",
        full_name: "Smoke Test Supplier B",
        role: "supplier",
        phone: "+27110000102",
        phone_verified_at: nowIso,
        registration_status: "complete",
        verification_status: "Verified",
        csd_number: "CSD-SMOKE-B",
        bbbee_level: "Level 4",
        tax_status: "VAT registered",
      },
    ])
    if (profileError) throw profileError

    report.adminUserId = adminUser.data.user.id
    report.adminEmail = adminEmail
    report.supplierAUserId = supplierA.data.user.id
    report.supplierAEmail = supplierAEmail
    report.supplierBUserId = supplierB.data.user.id
    report.supplierBEmail = supplierBEmail

    const page = await browser.newPage()
    page.on("dialog", (dialog) => dialog.accept())
    page.on("pageerror", (err) => console.error("[browser pageerror]", err))
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("[browser console error]", msg.text())
    })
    await page.setViewport({ width: 1440, height: 1200 })
    page.setDefaultTimeout(45_000)

    // --- Admin creates the RFQ --------------------------------------------------
    logStage("logging in as admin")
    await login(page, adminEmail, password)

    logStage("navigating to RFQ creation page")
    await page.goto(`${appUrl}/dashboard/admin/rfqs/new`, { waitUntil: "networkidle2" })
    await page.waitForSelector("#title", { timeout: 45_000 })

    await clearAndType(page, "#title", rfqTitle)
    // buyerOrganisation / contactPerson / contactEmail are auto-filled from the admin's own
    // profile by the page's bootstrap effect, so clear them before typing (see clearAndType).
    await clearAndType(page, "#buyerOrganisation", "Smoke Test Buyer Org")
    await page.select("#category", "Facilities & Cleaning")
    await clearAndType(page, "#contactPerson", "Smoke Test Admin")
    await clearAndType(page, "#contactEmail", adminEmail)
    await clearAndType(
      page,
      "#shortDescription",
      "Automated smoke test RFQ - safe to ignore/delete. Verifies the award/PO flow end to end.",
    )
    await clearAndType(
      page,
      "#scope",
      "Automated smoke test scope: supply and delivery of PPE equipment, used to verify the RFQ award and purchase order issuance flow. This is not a real procurement request.",
    )
    await setDateInputValue(page, "#closingDate", closingDateStr)

    await clickButtonByText(page, "Continue")
    await page.waitForSelector("#bbbeeRequirement", { timeout: 20_000 })

    await page.select("#bbbeeRequirement", "Any level")
    await clickButtonByText(page, "Gauteng")

    await clickButtonByText(page, "Continue")
    await page.waitForFunction(() => document.body.innerText.includes("Items and services"), { timeout: 20_000 })

    await page.type(
      "table tbody tr:nth-child(1) td:nth-child(1) input",
      "Smoke test line item - safety helmets and gloves",
    )

    // Avoid emailing real production admins/buyers and avoid public listing for this synthetic RFQ.
    await toggleCheckboxByLabelText(page, "Notify matched suppliers")
    await toggleCheckboxByLabelText(page, "List publicly on opportunities page")

    await clickButtonByText(page, "Publish RFQ")
    await page.waitForFunction(() => /\/rfqs\/\d+/.test(location.pathname), { timeout: 30_000 })

    const rfqUrl = page.url()
    const rfqIdMatch = rfqUrl.match(/\/rfqs\/(\d+)/)
    if (!rfqIdMatch) throw new Error(`Could not determine RFQ id from URL: ${rfqUrl}`)
    const rfqId = Number(rfqIdMatch[1])
    report.rfqId = rfqId
    logStage(`RFQ created: id=${rfqId} url=${rfqUrl}`)

    const { data: createdRfq, error: createdRfqError } = await admin
      .from("rfqs")
      .select("id, title, status")
      .eq("id", rfqId)
      .single()
    if (createdRfqError) throw createdRfqError
    report.rfqTitle = createdRfq?.title ?? null
    report.rfqStatusAfterCreate = createdRfq?.status ?? null

    // --- Supplier A submits a quote ---------------------------------------------
    logStage("switching to supplier A")
    await switchUser(page, supplierAEmail, password)
    await page.goto(`${appUrl}/dashboard/rfqs/${rfqId}/quote`, { waitUntil: "networkidle2" })
    await page.waitForFunction(() => document.body.innerText.includes("Submit quote"), { timeout: 30_000 })

    await page.type("table tbody tr:nth-child(1) td:nth-child(1) input", "PPE bundle - standard helmets and gloves")
    await page.type("table tbody tr:nth-child(1) td:nth-child(2) input", "10")
    await page.type("table tbody tr:nth-child(1) td:nth-child(3) input", "1500")

    const selectsA = await page.$$("select")
    if (selectsA.length < 3) throw new Error(`Expected 3 selects on the quote page, found ${selectsA.length}.`)
    await selectsA[1].select("2-4 weeks")
    await selectsA[2].select("30 days from invoice")

    await clickButtonByText(page, "Submit quote →")
    await page.waitForFunction(() => document.body.innerText.includes("Quote submitted successfully"), {
      timeout: 30_000,
    })

    const { data: quoteAData, error: quoteAError } = await admin
      .from("quotes")
      .select("id, amount, timeline, status")
      .eq("rfq_id", rfqId)
      .eq("supplier_id", supplierA.data.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    if (quoteAError) throw quoteAError
    report.quoteAId = quoteAData.id
    report.quoteAAmount = quoteAData.amount
    report.quoteATimeline = quoteAData.timeline
    logStage(`Supplier A quote created: id=${quoteAData.id} amount=${quoteAData.amount}`)

    // --- Supplier B submits a competing quote -----------------------------------
    logStage("switching to supplier B")
    await switchUser(page, supplierBEmail, password)
    await page.goto(`${appUrl}/dashboard/rfqs/${rfqId}/quote`, { waitUntil: "networkidle2" })
    await page.waitForFunction(() => document.body.innerText.includes("Submit quote"), { timeout: 30_000 })

    await page.type("table tbody tr:nth-child(1) td:nth-child(1) input", "PPE bundle - premium helmets and gloves")
    await page.type("table tbody tr:nth-child(1) td:nth-child(2) input", "10")
    await page.type("table tbody tr:nth-child(1) td:nth-child(3) input", "2200")

    const selectsB = await page.$$("select")
    if (selectsB.length < 3) throw new Error(`Expected 3 selects on the quote page, found ${selectsB.length}.`)
    await selectsB[1].select("4-6 weeks")
    await selectsB[2].select("50% upfront / 50% on delivery")

    await clickButtonByText(page, "Submit quote →")
    await page.waitForFunction(() => document.body.innerText.includes("Quote submitted successfully"), {
      timeout: 30_000,
    })

    const { data: quoteBData, error: quoteBError } = await admin
      .from("quotes")
      .select("id, amount, timeline, status")
      .eq("rfq_id", rfqId)
      .eq("supplier_id", supplierB.data.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    if (quoteBError) throw quoteBError
    report.quoteBId = quoteBData.id
    report.quoteBAmount = quoteBData.amount
    report.quoteBTimeline = quoteBData.timeline
    logStage(`Supplier B quote created: id=${quoteBData.id} amount=${quoteBData.amount}`)

    // --- Admin opens the comparison page and awards Supplier A ------------------
    logStage("switching back to admin for award")
    await switchUser(page, adminEmail, password)
    await page.goto(`${appUrl}/dashboard/admin/rfqs/${rfqId}/quotes`, { waitUntil: "networkidle2" })
    await page.waitForFunction(() => document.body.innerText.includes("RFQ Quote Comparison"), { timeout: 30_000 })
    await page.waitForFunction(() => document.body.innerText.includes("Smoke Test Supplier A"), { timeout: 30_000 })

    const { count: poCountBeforeAward } = await admin
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("rfq_id", rfqId)

    logStage("clicking Award Quote for Supplier A")
    await clickButtonInRowByText(page, "Smoke Test Supplier A", "Award Quote")
    await page.waitForFunction(() => document.body.innerText.includes("has been awarded to quote"), {
      timeout: 30_000,
    })

    logStage("clicking Generate Purchase Order for Supplier A")
    await clickButtonInRowByText(page, "Smoke Test Supplier A", "Generate Purchase Order")
    await page.waitForFunction(() => document.body.innerText.includes("has been generated with"), { timeout: 30_000 })

    // --- Capture post-award state via the service-role client -------------------
    const { data: rfqAfterAward, error: rfqAfterAwardError } = await admin
      .from("rfqs")
      .select("id, status")
      .eq("id", rfqId)
      .single()
    if (rfqAfterAwardError) throw rfqAfterAwardError

    const { data: quotesAfterAward, error: quotesAfterAwardError } = await admin
      .from("quotes")
      .select("id, status, supplier_id, amount")
      .eq("rfq_id", rfqId)
      .order("id", { ascending: true })
    if (quotesAfterAwardError) throw quotesAfterAwardError

    const supplierIds = [supplierA.data.user.id, supplierB.data.user.id]

    const { data: notificationRows, error: notificationRowsError } = await admin
      .from("notifications")
      .select("id, user_id, type, title, message, link")
      .in("user_id", supplierIds)
      .order("id", { ascending: true })
    if (notificationRowsError) throw notificationRowsError

    const { data: whatsappRows, error: whatsappRowsError } = await admin
      .from("whatsapp_alerts")
      .select("id, user_id, supplier_id, alert_type, title, message, status, link")
      .in("supplier_id", supplierIds)
      .order("id", { ascending: true })
    if (whatsappRowsError) throw whatsappRowsError

    const { data: poRowsAfterAward, error: poRowsAfterAwardError } = await admin
      .from("purchase_orders")
      .select("id, po_number, rfq_id, quote_id, supplier_id, status")
      .eq("rfq_id", rfqId)
      .order("id", { ascending: true })
    if (poRowsAfterAwardError) throw poRowsAfterAwardError

    report.rfqStatusAfterAward = rfqAfterAward?.status ?? null
    report.quotesAfterAward = quotesAfterAward
    report.notificationRows = notificationRows
    report.whatsappAlertRows = whatsappRows
    report.purchaseOrderRowsAfterAward = poRowsAfterAward
    report.poCountBeforeAward = poCountBeforeAward ?? null

    const poRow = (poRowsAfterAward ?? [])[0] ?? null
    report.purchaseOrderId = poRow?.id ?? null
    report.purchaseOrderNumber = poRow?.po_number ?? null
    report.purchaseOrderStatus = poRow?.status ?? null

    // --- Idempotency test: re-invoke the exact RPCs that 772d30e protects -------
    logStage("running idempotency checks against award_rfq_quote / create_purchase_order_for_award")

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: signInError } = await authClient.auth.signInWithPassword({ email: adminEmail, password })
    if (signInError) throw signInError

    const { count: poCountBeforeRetry } = await admin
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("rfq_id", rfqId)

    const { data: awardRetryData, error: awardRetryError } = await authClient.rpc("award_rfq_quote", {
      p_rfq_id: rfqId,
      p_quote_id: quoteAData.id,
    })
    if (awardRetryError) throw awardRetryError

    const { data: poRetryData, error: poRetryError } = await authClient.rpc("create_purchase_order_for_award", {
      p_rfq_id: rfqId,
    })
    if (poRetryError) throw poRetryError

    const { count: poCountAfterRetry } = await admin
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("rfq_id", rfqId)

    const { data: poRowsAfterRetry, error: poRowsAfterRetryError } = await admin
      .from("purchase_orders")
      .select("id, po_number")
      .eq("rfq_id", rfqId)
      .order("id", { ascending: true })
    if (poRowsAfterRetryError) throw poRowsAfterRetryError

    const idempotencyPass =
      poCountBeforeAward === 0 &&
      poCountBeforeRetry === 1 &&
      poCountAfterRetry === 1 &&
      (poRetryData as { id?: number } | null)?.id === poRow?.id &&
      (awardRetryData as { status?: string } | null)?.status === "already_awarded"

    report.idempotency = {
      awardRetryResult: awardRetryData,
      poRetryResult: poRetryData,
      poCountBeforeAward,
      poCountBeforeRetry,
      poCountAfterRetry,
      poIdBeforeRetry: poRow?.id ?? null,
      poIdsAfterRetry: (poRowsAfterRetry ?? []).map((row) => row.id),
      pass: idempotencyPass,
    }

    logStage(`idempotency check result: ${idempotencyPass ? "PASS" : "FAIL"}`)

    report.success = true
  } catch (error) {
    report.success = false
    report.error = error instanceof Error ? error.message : String(error)
    throw error
  } finally {
    await browser.close()
    console.log(JSON.stringify(report, null, 2))
    if (serverProcess) {
      logStage(
        `Left "next dev" running detached at ${appUrl} (pid ${serverProcess.pid ?? "unknown"}). ` +
          `Stop it manually if needed, e.g.: taskkill /PID ${serverProcess.pid ?? "<pid>"} /T /F`,
      )
    } else {
      logStage(`App at ${appUrl} was already running before this script started; left it as-is.`)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
