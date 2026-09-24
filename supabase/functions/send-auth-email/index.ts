import { Resend } from "npm:resend@4.0.0";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

type EmailAction =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email"
  | "reauthentication"
  | string;

type SendEmailPayload = {
  user: {
    email: string;
    new_email?: string;
  };
  email_data: {
    token?: string;
    token_new?: string;
    email_action_type: EmailAction;
  };
};

const resendApiKey =
  Deno.env.get("RESEND_API_KEY") ?? Deno.env.get("Resend_api_key");
const rawHookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
const fromEmail =
  Deno.env.get("RESEND_FROM_EMAIL") ?? "RegisterBox <onboarding@resend.dev>";

const htmlEscape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const actionCopy = (action: EmailAction) => {
  switch (action) {
    case "signup":
      return {
        subject: "Confirm your RegisterBox account",
        eyebrow: "Welcome to RegisterBox",
        title: "Confirm your email",
        message: "Use this one-time code to finish creating your account.",
      };
    case "recovery":
      return {
        subject: "Reset your RegisterBox access",
        eyebrow: "RegisterBox security",
        title: "Reset your access",
        message: "Use this one-time code to continue securely.",
      };
    case "email_change":
      return {
        subject: "Confirm your new RegisterBox email",
        eyebrow: "RegisterBox security",
        title: "Confirm your email change",
        message: "Use this one-time code to confirm your new email address.",
      };
    case "reauthentication":
      return {
        subject: "Your RegisterBox verification code",
        eyebrow: "RegisterBox security",
        title: "Verify it’s you",
        message: "Use this one-time code to confirm this sensitive action.",
      };
    default:
      return {
        subject: "Your RegisterBox sign-in code",
        eyebrow: "Secure sign in",
        title: "Your one-time code",
        message: "Use this code to sign in to RegisterBox.",
      };
  }
};

const buildEmail = (token: string, action: EmailAction) => {
  const copy = actionCopy(action);
  const safeToken = htmlEscape(token);
  const codeBlock = safeToken
    ? `<div style="margin:28px 0;padding:22px;text-align:center;background:#f4f7ff;border:1px solid #d8e3ff;border-radius:16px;font-size:34px;font-weight:800;letter-spacing:10px;color:#1559d6">${safeToken}</div>`
    : "";

  return {
    subject: copy.subject,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f3f7ff;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#10214d">
    <div style="display:none;max-height:0;overflow:hidden">${copy.subject}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7ff;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #dbe6ff;border-radius:24px;overflow:hidden;box-shadow:0 14px 45px rgba(25,72,165,.12)">
          <tr><td style="background:linear-gradient(135deg,#0a2b73,#1768ff);padding:30px 34px;color:#ffffff">
            <div style="font-size:20px;font-weight:800">RegisterBox</div>
            <div style="margin-top:6px;font-size:13px;opacity:.82">Start. Run. Stay Compliant.</div>
          </td></tr>
          <tr><td style="padding:34px">
            <div style="font-size:12px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#1768ff">${copy.eyebrow}</div>
            <h1 style="font-size:28px;line-height:1.2;margin:12px 0;color:#10214d">${copy.title}</h1>
            <p style="font-size:16px;line-height:1.6;margin:0;color:#52627f">${copy.message}</p>
            ${codeBlock}
            <p style="font-size:14px;line-height:1.6;margin:0;color:#71809b">This code expires shortly and can only be used once. If you didn’t request it, you can safely ignore this email.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!resendApiKey || !rawHookSecret) {
    console.error("Missing RESEND_API_KEY or SEND_EMAIL_HOOK_SECRET");
    return Response.json({ error: "Email service is not configured" }, { status: 500 });
  }

  try {
    const body = await request.text();
    const webhook = new Webhook(rawHookSecret.replace("v1,whsec_", ""));
    const payload = webhook.verify(
      body,
      Object.fromEntries(request.headers),
    ) as SendEmailPayload;

    const resend = new Resend(resendApiKey);
    const action = payload.email_data.email_action_type;
    const deliveries = action === "email_change" && payload.user.new_email
      ? [
          {
            to: payload.user.email,
            token: payload.email_data.token ?? "",
          },
          {
            to: payload.user.new_email,
            token: payload.email_data.token_new ?? payload.email_data.token ?? "",
          },
        ]
      : [{ to: payload.user.email, token: payload.email_data.token ?? "" }];

    for (const delivery of deliveries) {
      const email = buildEmail(delivery.token, action);
      const { error } = await resend.emails.send({
        from: fromEmail,
        to: [delivery.to],
        subject: email.subject,
        html: email.html,
      });

      if (error) throw error;
    }

    return Response.json({}, { status: 200 });
  } catch (error) {
    console.error("Auth email hook failed", error);
    return Response.json(
      { error: "Unable to send authentication email" },
      { status: 401 },
    );
  }
});
