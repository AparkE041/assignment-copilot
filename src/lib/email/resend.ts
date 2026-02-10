import { Resend } from "resend";

export async function sendReminderEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "dummy-key-for-build") {
    if (process.env.NODE_ENV === "development") {
      console.log("[Reminder] RESEND_API_KEY not set; email skipped.");
    }
    return { success: true };
  }

  try {
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL ?? "assignments@resend.dev";
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
