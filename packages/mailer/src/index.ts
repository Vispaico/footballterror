/**
 * Mailer — Hostinger SMTP transactional email
 *
 * Uses nodemailer with your existing SMTP credentials.
 * Templates for verification + password reset.
 */

import nodemailer from "nodemailer";
import { env } from "@footballterror/config";
import { createLogger } from "@footballterror/logger";

const log = createLogger("mailer");

let _transport: nodemailer.Transporter | null = null;

function transport(): nodemailer.Transporter {
  if (!_transport) {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
      throw new Error("SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS in .env");
    }
    _transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return _transport;
}

export interface SendMailResult {
  accepted: string[];
  rejected: string[];
  messageId: string;
}

async function send(to: string, subject: string, html: string): Promise<SendMailResult> {
  const info = await transport().sendMail({
    from: `"FootballTerror" <${env.MAIL_FROM ?? env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
  log.info({ to, subject, messageId: info.messageId }, "email sent");
  return { accepted: info.accepted as string[], rejected: info.rejected as string[], messageId: info.messageId };
}

function shell(title: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#18181b;border-radius:12px;border:1px solid #27272a;overflow:hidden;">
  <div style="padding:24px 32px;border-bottom:1px solid #27272a;">
    <span style="font-size:20px;font-weight:900;color:#fafafa;">Football<span style="color:#dc2626;">Terror</span></span>
  </div>
  <div style="padding:32px;">
    <h2 style="margin:0 0 16px;font-size:18px;color:#fafafa;">${title}</h2>
    <div style="font-size:14px;line-height:1.7;color:#a1a1aa;">${bodyHtml}</div>
    ${cta ? `
    <div style="margin-top:28px;">
      <a href="${cta.url}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;">${cta.label}</a>
    </div>
    <p style="margin-top:20px;font-size:11px;color:#52525b;word-break:break-all;">Or copy this link: ${cta.url}</p>` : ""}
  </div>
  <div style="padding:16px 32px;border-top:1px solid #27272a;">
    <p style="margin:0;font-size:11px;color:#52525b;">You received this email because an account was created at footballterror.com. If this wasn't you, ignore this email.</p>
  </div>
</div>
</body></html>`;
}

export const mailer = {
  async verifyConnection(): Promise<boolean> {
    await transport().verify();
    return true;
  },

  /** Email address verification (on signup) */
  async sendVerificationEmail(to: string, token: string): Promise<SendMailResult> {
    const url = `${env.APP_URL}/auth/verify?token=${encodeURIComponent(token)}`;
    return send(
      to,
      "Verify your FootballTerror account",
      shell(
        "Verify your email",
        `<p>Welcome to FootballTerror.</p><p>Confirm your email address to activate your account. This link expires in 24 hours.</p>`,
        { label: "Verify Email", url }
      )
    );
  },

  /** Password reset */
  async sendPasswordResetEmail(to: string, token: string): Promise<SendMailResult> {
    const url = `${env.APP_URL}/auth/reset?token=${encodeURIComponent(token)}`;
    return send(
      to,
      "Reset your FootballTerror password",
      shell(
        "Password reset requested",
        `<p>We received a request to reset the password for your account.</p><p>This link expires in 1 hour and can only be used once.</p><p>If you didn't request this, you can safely ignore this email — your password is unchanged.</p>`,
        { label: "Reset Password", url }
      )
    );
  },

  /** Generic notification (match alerts etc., future use) */
  async sendNotificationEmail(to: string, subject: string, bodyHtml: string): Promise<SendMailResult> {
    return send(to, subject, shell(subject, bodyHtml));
  },
};
