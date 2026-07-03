// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */
// Deno runtime handles these URL imports; TypeScript in the app does not.
// @ts-ignore
import { serve } from "https://deno.land/std@0.205.0/http/server.ts";
// @ts-ignore
import { encode as base64Encode } from "https://deno.land/std@0.205.0/encoding/base64.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
// @ts-ignore
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
// @ts-ignore
import {
  addDays,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "https://deno.land/x/date_fns/index.ts";
// @ts-ignore
import { fromZonedTime, toZonedTime } from "https://deno.land/x/date_fns_tz/index.ts";

type ProfileRow = {
  id: string;
  display_name: string | null;
  report_timezone: string | null;
  reports_enabled: boolean;
};

type TransactionRow = {
  amount: number;
  vendor: string;
  category: string;
  source: string;
  created_at: string;
};

type ReportJob = {
  reportType: "weekly" | "monthly";
  periodStart: Date;
  periodEnd: Date;
  monthStart: Date;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const REPORTS_FROM_EMAIL = Deno.env.get("REPORTS_FROM_EMAIL") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const getReportJobs = (nowLocal: Date): ReportJob[] => {
  const day = nowLocal.getDate();
  const monthStart = startOfMonth(nowLocal);
  const jobs: ReportJob[] = [];

  if (day === 8) {
    jobs.push({
      reportType: "weekly",
      periodStart: monthStart,
      periodEnd: addDays(monthStart, 6),
      monthStart,
    });
  }

  if (day === 15) {
    jobs.push({
      reportType: "weekly",
      periodStart: addDays(monthStart, 7),
      periodEnd: addDays(monthStart, 13),
      monthStart,
    });
  }

  if (day === 22) {
    jobs.push({
      reportType: "weekly",
      periodStart: addDays(monthStart, 14),
      periodEnd: addDays(monthStart, 20),
      monthStart,
    });
  }

  if (day === 1) {
    const prevMonthStart = startOfMonth(subMonths(nowLocal, 1));
    const prevMonthEnd = endOfMonth(prevMonthStart);
    jobs.push({
      reportType: "weekly",
      periodStart: addDays(prevMonthStart, 21),
      periodEnd: prevMonthEnd,
      monthStart: prevMonthStart,
    });
    jobs.push({
      reportType: "monthly",
      periodStart: prevMonthStart,
      periodEnd: prevMonthEnd,
      monthStart: prevMonthStart,
    });
  }

  return jobs;
};

const getWeekNumber = (periodStart: Date): number => {
  const day = periodStart.getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
};

const createPdf = async (payload: {
  userName: string;
  periodLabel: string;
  reportLabel: string;
  transactions: TransactionRow[];
  timezone: string;
}): Promise<Uint8Array> => {
  const { userName, periodLabel, reportLabel, transactions, timezone } = payload;
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const lineHeight = 14;

  const drawText = (text: string, size = 12, bold = false) => {
    page.drawText(text, {
      x: 40,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= lineHeight + (size > 12 ? 2 : 0);
  };

  drawText("Money Harmony Report", 18, true);
  drawText(reportLabel, 13, true);
  drawText(`User: ${userName}`, 11);
  drawText(`Period: ${periodLabel}`, 11);
  drawText(`Timezone: ${timezone}`, 10);
  y -= 8;

  const totalIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = totalIncome - totalExpenses;

  drawText(`Total Income: ${totalIncome.toFixed(2)}`, 11, true);
  drawText(`Total Expenses: ${totalExpenses.toFixed(2)}`, 11, true);
  drawText(`Net: ${net.toFixed(2)}`, 11, true);
  y -= 6;

  drawText("Transactions", 13, true);
  y -= 2;

  if (transactions.length === 0) {
    drawText("No transactions recorded for this period.", 11);
  } else {
    drawText("Date | Vendor | Category | Amount", 11, true);
    y -= 4;

    for (const tx of transactions) {
      const localDate = toZonedTime(new Date(tx.created_at), timezone);
      const dateLabel = format(localDate, "MMM d, yyyy");
      const amountLabel = `${tx.amount > 0 ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}`;
      const line = `${dateLabel} | ${tx.vendor} | ${tx.category} | ${amountLabel}`;

      if (y < 60) {
        page = pdf.addPage([595.28, 841.89]);
        y = 800;
        page.drawText("Transactions (cont.)", {
          x: 40,
          y,
          size: 13,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight + 4;
      }

      page.drawText(line, {
        x: 40,
        y,
        size: 10,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 12;
    }
  }

  return await pdf.save();
};

const sendEmail = async (payload: {
  to: string;
  subject: string;
  text: string;
  attachmentName: string;
  attachmentBytes: Uint8Array;
  headers: Record<string, string>;
}) => {
  const { to, subject, text, attachmentName, attachmentBytes, headers } = payload;
  const body = {
    from: REPORTS_FROM_EMAIL,
    to: [to],
    subject,
    text,
    headers,
    attachments: [
      {
        filename: attachmentName,
        content: base64Encode(attachmentBytes),
        content_type: "application/pdf",
      },
    ],
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend error ${response.status}: ${errorText}`);
  }

  return await response.json();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY || !REPORTS_FROM_EMAIL) {
    return new Response("Missing required environment variables", { status: 500, headers: corsHeaders });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = Boolean(body?.dryRun);
  const testMode = Boolean(body?.test);
  const targetUserId = typeof body?.userId === "string" ? body.userId : null;
  const targetDate = body?.targetDate ? new Date(body.targetDate) : new Date();

  if (testMode || targetUserId) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";

    if (!token) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    if (targetUserId && authData.user.id !== targetUserId) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
  }

  let profileQuery = supabase
    .from("profiles")
    .select("id, display_name, report_timezone, reports_enabled")
    .eq("reports_enabled", true);

  if (targetUserId) {
    profileQuery = profileQuery.eq("id", targetUserId);
  }

  const { data: profiles, error: profileError } = await profileQuery;

  if (profileError) {
    return new Response(profileError.message, { status: 500, headers: corsHeaders });
  }

  const results: Array<{ userId: string; sent: number; skipped: number }> = [];

  for (const profile of (profiles ?? []) as ProfileRow[]) {
    const timezone = profile.report_timezone || "UTC";
    const nowLocal = toZonedTime(targetDate, timezone);
    const jobs = testMode
      ? [{
          reportType: "monthly",
          periodStart: startOfMonth(nowLocal),
          periodEnd: nowLocal,
          monthStart: startOfMonth(nowLocal),
        }]
      : getReportJobs(nowLocal);

    if (jobs.length === 0) {
      results.push({ userId: profile.id, sent: 0, skipped: 0 });
      continue;
    }

    let sentCount = 0;
    let skippedCount = 0;

    const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(profile.id);
    if (userError || !userResult?.user?.email) {
      results.push({ userId: profile.id, sent: 0, skipped: jobs.length });
      continue;
    }

    const email = userResult.user.email;

    for (const job of jobs) {
      const periodStart = new Date(job.periodStart);
      const periodEnd = new Date(job.periodEnd);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setHours(23, 59, 59, 999);

      const startUtc = fromZonedTime(periodStart, timezone);
      const endUtc = fromZonedTime(periodEnd, timezone);

      if (!testMode) {
        const { data: existing } = await supabase
          .from("report_runs")
          .select("id")
          .eq("user_id", profile.id)
          .eq("report_type", job.reportType)
          .eq("period_start", format(job.periodStart, "yyyy-MM-dd"))
          .eq("period_end", format(job.periodEnd, "yyyy-MM-dd"))
          .maybeSingle();

        if (existing?.id) {
          skippedCount += 1;
          continue;
        }
      }

      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("amount, vendor, category, source, created_at")
        .eq("user_id", profile.id)
        .gte("created_at", startUtc.toISOString())
        .lte("created_at", endUtc.toISOString())
        .order("created_at", { ascending: true });

      if (txError) {
        skippedCount += 1;
        continue;
      }

      const periodLabel = `${format(job.periodStart, "MMM d, yyyy")} - ${format(job.periodEnd, "MMM d, yyyy")}`;
      const monthLabel = format(job.monthStart, "MMMM yyyy");
      const weekLabel = job.reportType === "weekly" ? `Week ${getWeekNumber(job.periodStart)}` : "Monthly";
      const reportLabel = testMode ? `${monthLabel} Test Report` : `${monthLabel} ${weekLabel} Report`;

      const pdfBytes = await createPdf({
        userName: profile.display_name || email,
        periodLabel,
        reportLabel,
        transactions: (transactions ?? []) as TransactionRow[],
        timezone,
      });

      const messageId = `<${crypto.randomUUID()}@reports.money-harmony>`;
      const { data: threadData } = testMode
        ? { data: null }
        : await supabase
            .from("report_threads")
            .select("thread_message_id")
            .eq("user_id", profile.id)
            .eq("month_start", format(job.monthStart, "yyyy-MM-dd"))
            .maybeSingle();

      const rootThreadId = threadData?.thread_message_id;
      const headers: Record<string, string> = {
        "Message-ID": messageId,
      };

      if (rootThreadId) {
        headers["In-Reply-To"] = rootThreadId;
        headers["References"] = rootThreadId;
      }

      const subject = `Money Harmony - ${reportLabel}`;
      const text = `Hello ${profile.display_name || "there"},\n\nYour ${reportLabel} is attached as a PDF.\n\nPeriod: ${periodLabel}\nTimezone: ${timezone}\n\nThanks,\nMoney Harmony`;
      const attachmentName = `money-harmony-${format(job.periodStart, "yyyy-MM-dd")}-to-${format(job.periodEnd, "yyyy-MM-dd")}.pdf`;

      if (!dryRun) {
        await sendEmail({
          to: email,
          subject,
          text,
          attachmentName,
          attachmentBytes: pdfBytes,
          headers,
        });
      }

      if (!testMode && !threadData?.thread_message_id) {
        await supabase.from("report_threads").insert({
          user_id: profile.id,
          month_start: format(job.monthStart, "yyyy-MM-dd"),
          thread_message_id: messageId,
        });
      }

      if (!testMode) {
        await supabase.from("report_runs").insert({
          user_id: profile.id,
          report_type: job.reportType,
          period_start: format(job.periodStart, "yyyy-MM-dd"),
          period_end: format(job.periodEnd, "yyyy-MM-dd"),
          message_id: messageId,
          thread_message_id: rootThreadId ?? messageId,
        });
      }

      sentCount += 1;
    }

    results.push({ userId: profile.id, sent: sentCount, skipped: skippedCount });
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
