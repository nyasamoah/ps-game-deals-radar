import { Resend } from "resend";
import { createServerSupabaseClient } from "./supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Send Email Notification ──
export async function sendEmailNotification(to, subject, deals) {
  const dealRows = deals
    .map(
      (d) =>
        `<tr>
      <td style="padding:12px;border-bottom:1px solid #1a1a2e;">
        <strong style="color:#e8eaed;">${d.title}</strong><br>
        <span style="color:#8892a4;font-size:13px;">${d.platforms?.join(", ")} · ${d.genre}</span>
      </td>
      <td style="padding:12px;border-bottom:1px solid #1a1a2e;text-align:right;">
        <span style="color:#00e676;font-size:18px;font-weight:700;">$${d.sale_price}</span>
        <span style="color:#4a5568;text-decoration:line-through;font-size:13px;margin-left:8px;">$${d.original_price}</span><br>
        <span style="color:#ff2d55;font-weight:600;">-${d.discount_percent}%</span>
      </td>
    </tr>`
    )
    .join("");

  const html = `
  <div style="background:#060610;color:#e8eaed;font-family:Arial,sans-serif;padding:32px;max-width:600px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#00d4ff;margin:0;font-size:24px;">🎮 PS Game Deals Radar</h1>
      <p style="color:#8892a4;font-size:14px;">v1.0.0 · Deal Alert</p>
    </div>
    <h2 style="color:#fff;font-size:18px;">${subject}</h2>
    <table style="width:100%;border-collapse:collapse;background:#0c0c1a;border-radius:12px;overflow:hidden;">
      ${dealRows}
    </table>
    <p style="text-align:center;margin-top:24px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background:linear-gradient(135deg,#006fff,#00d4ff);color:#fff;padding:12px 32px;border-radius:10px;text-decoration:none;font-weight:700;">View All Deals</a>
    </p>
    <p style="text-align:center;color:#4a5568;font-size:11px;margin-top:24px;">
      PS Game Deals Radar v1.0.0 · <a href="${process.env.NEXT_PUBLIC_APP_URL}/account" style="color:#4a5568;">Manage notifications</a>
    </p>
  </div>`;

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "PS Game Deals Radar <alerts@psgamedeals.app>",
      to,
      subject: `🎮 ${subject}`,
      html,
    });
    return true;
  } catch (err) {
    console.error("Email send error:", err);
    return false;
  }
}

// ── Send Telegram Notification ──
export async function sendTelegramNotification(chatId, deals) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) return false;

  const lines = deals.slice(0, 10).map(
    (d) => `🎮 *${d.title}*\n💰 $${d.sale_price} ~~$${d.original_price}~~ (-${d.discount_percent}%)`
  );

  const text = `🔔 *PS Game Deals Radar v1.0.0*\n\n${lines.join("\n\n")}\n\n[View all deals](${process.env.NEXT_PUBLIC_APP_URL})`;

  try {
    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      }
    );
    return true;
  } catch (err) {
    console.error("Telegram send error:", err);
    return false;
  }
}

// ── Process all notifications for all users ──
export async function processNotifications() {
  const supabase = createServerSupabaseClient();

  // Get all users with alerts enabled
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .or("notification_email.eq.true,notification_telegram.eq.true,notification_push.eq.true");

  if (!users?.length) return { sent: 0 };

  let totalSent = 0;

  for (const user of users) {
    // Get this user's alert rules
    const { data: rules } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_enabled", true);

    if (!rules?.length) continue;

    // Find matching deals
    const { data: deals } = await supabase.rpc("get_alerted_games", { p_user_id: user.id });

    if (!deals?.length) continue;

    // Get prices for these games
    const gameIds = deals.map((d) => d.id);
    const { data: prices } = await supabase
      .from("prices")
      .select("*")
      .in("game_id", gameIds)
      .eq("region", user.default_region || "US")
      .eq("is_on_sale", true);

    const dealsWithPrices = deals.map((d) => {
      const price = prices?.find((p) => p.game_id === d.id);
      return { ...d, sale_price: price?.sale_price, original_price: price?.original_price, discount_percent: price?.discount_percent };
    }).filter((d) => d.sale_price);

    if (!dealsWithPrices.length) continue;

    // Check we haven't already notified about these deals recently
    const { data: recentNotifs } = await supabase
      .from("notifications")
      .select("game_id")
      .eq("user_id", user.id)
      .gte("sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const recentGameIds = new Set(recentNotifs?.map((n) => n.game_id) || []);
    const newDeals = dealsWithPrices.filter((d) => !recentGameIds.has(d.id));

    if (!newDeals.length) continue;

    // Send notifications
    if (user.notification_email && user.email) {
      const sent = await sendEmailNotification(
        user.email,
        `${newDeals.length} game${newDeals.length > 1 ? "s" : ""} hit your price target!`,
        newDeals
      );
      if (sent) totalSent++;
    }

    if (user.notification_telegram && user.telegram_chat_id) {
      const sent = await sendTelegramNotification(user.telegram_chat_id, newDeals);
      if (sent) totalSent++;
    }

    // Log notifications
    const notifRows = newDeals.map((d) => ({
      user_id: user.id,
      game_id: d.id,
      channel: "email",
      message: `${d.title} is now $${d.sale_price} (-${d.discount_percent}%)`,
    }));

    await supabase.from("notifications").insert(notifRows);
  }

  return { sent: totalSent };
}
