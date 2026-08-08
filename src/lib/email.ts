// src/lib/email.ts

import nodemailer from "nodemailer";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOSPITAL_NAME = "Muslim Specialist Hospital, Zaria";
const HOSPITAL_ADDRESS = "Danmagaji, Tukur Tukur, Zaria, Kaduna State";
const APP_NAME = "SPRMS — Secure Patient Record Management System";

// ─── Transporter ─────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Base Email Template ──────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${HOSPITAL_NAME} — SPRMS Notification</title>
    </head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:#f1f5f9;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0"
              style="background:#ffffff;border-radius:8px;overflow:hidden;
                     box-shadow:0 2px 8px rgba(0,0,0,0.08);">

              <!-- Header -->
              // Inside baseTemplate() — replace the <!-- Header --> <tr> block with:

<tr>
  <td style="background:#1D4ED8;padding:20px 32px;">
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td width="52" style="vertical-align:middle;">
          <div style="width:48px;height:48px;background:#ffffff;
                      border-radius:10px;overflow:hidden;
                      display:inline-block;">
            <img
              src="${process.env.NEXT_PUBLIC_APP_URL}/msh-logo.png"
              alt="Muslim Specialist Hospital, Zaria"
              width="48"
              height="48"
              style="width:48px;height:48px;object-fit:contain;
                     display:block;"
            />
          </div>
        </td>
        <td style="padding-left:14px;vertical-align:middle;">
          <h1 style="margin:0;color:#ffffff;font-size:15px;
                     font-weight:700;line-height:1.3;">
            ${HOSPITAL_NAME}
          </h1>
          <p style="margin:3px 0 0;color:#93c5fd;font-size:11px;">
            ${APP_NAME}
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px;">
                  ${content}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f8fafc;padding:16px 32px;
                           border-top:1px solid #e2e8f0;">
                  <p style="margin:0;color:#94a3b8;font-size:12px;
                            text-align:center;line-height:1.6;">
                    This is an automated message from
                    <strong>${HOSPITAL_NAME}</strong> — SPRMS.<br/>
                    ${HOSPITAL_ADDRESS}, Nigeria.<br/>
                    Please do not reply to this email.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ─── Send Email Helper ────────────────────────────────────────────────────────

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    console.log(`[Email] Sent to ${params.to}: ${params.subject}`);
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    // Do not throw — email failure should not break the main operation
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

/**
 * Welcome email for new staff accounts
 */
export async function sendStaffWelcomeEmail(
  to: string,
  name: string,
  role: string,
  temporaryPassword: string,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const html = baseTemplate(`
    <h2 style="color:#1e293b;margin:0 0 16px;">
      Welcome to SPRMS, ${name}!
    </h2>
    <p style="color:#475569;margin:0 0 16px;">
      Your staff account at <strong>${HOSPITAL_NAME}</strong> has been
      created. You can now log in using the credentials below.
    </p>

    <table style="background:#f1f5f9;border-radius:6px;padding:20px;
                  width:100%;margin:0 0 24px;">
      <tr>
  <td style="background:#1D4ED8;padding:20px 32px;">
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td width="52" style="vertical-align:middle;">
          <div style="width:48px;height:48px;background:#ffffff;
                      border-radius:10px;overflow:hidden;
                      display:inline-block;">
            <img
              src="${process.env.NEXT_PUBLIC_APP_URL}/msh-logo.png"
              alt="Muslim Specialist Hospital, Zaria"
              width="48"
              height="48"
              style="width:48px;height:48px;object-fit:contain;
                     display:block;"
            />
          </div>
        </td>
        <td style="padding-left:14px;vertical-align:middle;">
          <h1 style="margin:0;color:#ffffff;font-size:15px;
                     font-weight:700;line-height:1.3;">
            ${HOSPITAL_NAME}
          </h1>
          <p style="margin:3px 0 0;color:#93c5fd;font-size:11px;">
            ${APP_NAME}
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>
      <tr>
        <td style="color:#64748b;font-size:13px;padding:4px 0;">Email</td>
        <td style="color:#1e293b;font-weight:bold;font-size:13px;padding:4px 0;">
          ${to}
        </td>
      </tr>
      <tr>
        <td style="color:#64748b;font-size:13px;padding:4px 0;">
          Temporary Password
        </td>
        <td style="color:#1D4ED8;font-weight:bold;font-size:13px;padding:4px 0;">
          ${temporaryPassword}
        </td>
      </tr>
    </table>

    <p style="color:#dc2626;font-size:13px;margin:0 0 24px;">
      ⚠️ You will be required to change your password on first login.
    </p>

    <a href="${appUrl}/login"
      style="display:inline-block;background:#1D4ED8;color:#ffffff;
             padding:12px 28px;border-radius:6px;text-decoration:none;
             font-weight:bold;font-size:14px;">
      Login to SPRMS →
    </a>
  `);

  await sendEmail({
    to,
    subject: `Welcome to SPRMS — ${HOSPITAL_NAME}`,
    html,
  });
}

/**
 * Email verification for self-registered patients
 */
export async function sendEmailVerificationEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;

  const html = baseTemplate(`
    <h2 style="color:#1e293b;margin:0 0 16px;">
      Verify Your Email Address
    </h2>
    <p style="color:#475569;margin:0 0 16px;">
      Hello ${name}, thank you for registering with
      <strong>${HOSPITAL_NAME}</strong>.
      Please verify your email address to activate your account.
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}"
        style="display:inline-block;background:#059669;color:#ffffff;
               padding:14px 32px;border-radius:6px;text-decoration:none;
               font-weight:bold;font-size:15px;">
        ✓ Verify Email Address
      </a>
    </div>

    <p style="color:#94a3b8;font-size:12px;margin:0;">
      This link expires in 24 hours.
      If you did not create this account, please ignore this email.
    </p>
  `);

  await sendEmail({
    to,
    subject: `${HOSPITAL_NAME} — Please Verify Your Email Address`,
    html,
  });
}

/**
 * Password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const html = baseTemplate(`
    <h2 style="color:#1e293b;margin:0 0 16px;">Reset Your Password</h2>
    <p style="color:#475569;margin:0 0 16px;">
      Hello ${name}, we received a request to reset your SPRMS password
      for <strong>${HOSPITAL_NAME}</strong>.
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}"
        style="display:inline-block;background:#1D4ED8;color:#ffffff;
               padding:14px 32px;border-radius:6px;text-decoration:none;
               font-weight:bold;font-size:15px;">
        Reset Password →
      </a>
    </div>

    <p style="color:#94a3b8;font-size:12px;margin:0;">
      This link expires in 1 hour. If you did not request this,
      ignore this email. Your password will not change unless you
      click the link above.
    </p>
  `);

  await sendEmail({
    to,
    subject: `${HOSPITAL_NAME} — Password Reset Request`,
    html,
  });
}

/**
 * Account locked notification
 */
export async function sendAccountLockedEmail(
  to: string,
  name: string,
): Promise<void> {
  const lockDuration = process.env.LOCKOUT_DURATION_MINUTES ?? "30";

  const html = baseTemplate(`
    <h2 style="color:#dc2626;margin:0 0 16px;">
      ⚠️ Account Temporarily Locked
    </h2>
    <p style="color:#475569;margin:0 0 16px;">
      Hello ${name}, your SPRMS account at
      <strong>${HOSPITAL_NAME}</strong> has been temporarily locked
      due to multiple failed login attempts.
    </p>
    <p style="color:#475569;margin:0 0 16px;">
      Your account will be automatically unlocked after
      <strong>${lockDuration} minutes</strong>.
    </p>
    <p style="color:#475569;margin:0;">
      If this was not you, please contact your system administrator
      immediately.
    </p>
  `);

  await sendEmail({
    to,
    subject: `${HOSPITAL_NAME} — Account Temporarily Locked`,
    html,
  });
}

/**
 * Appointment confirmation email (template-based version)
 */
export async function sendAppointmentConfirmationEmail(
  to: string,
  name: string,
  doctorName: string,
  appointmentDate: string,
  appointmentTime: string,
  reason: string,
): Promise<void> {
  const html = baseTemplate(`
    <h2 style="color:#1e293b;margin:0 0 16px;">
      Appointment Confirmed ✓
    </h2>
    <p style="color:#475569;margin:0 0 24px;">
      Hello ${name}, your appointment at
      <strong>${HOSPITAL_NAME}</strong> has been confirmed.
    </p>

    <table style="background:#f1f5f9;border-radius:6px;padding:20px;
                  width:100%;margin:0 0 24px;">
      <tr>
        <td style="color:#64748b;font-size:13px;padding:6px 0;width:40%;">
          Doctor
        </td>
        <td style="color:#1e293b;font-weight:bold;font-size:13px;
                   padding:6px 0;">
          Dr. ${doctorName}
        </td>
      </tr>
      <tr>
        <td style="color:#64748b;font-size:13px;padding:6px 0;">Date</td>
        <td style="color:#1e293b;font-weight:bold;font-size:13px;
                   padding:6px 0;">
          ${appointmentDate}
        </td>
      </tr>
      <tr>
        <td style="color:#64748b;font-size:13px;padding:6px 0;">Time</td>
        <td style="color:#1e293b;font-weight:bold;font-size:13px;
                   padding:6px 0;">
          ${appointmentTime}
        </td>
      </tr>
      <tr>
        <td style="color:#64748b;font-size:13px;padding:6px 0;">Reason</td>
        <td style="color:#1e293b;font-size:13px;padding:6px 0;">
          ${reason}
        </td>
      </tr>
    </table>

    <p style="color:#475569;font-size:13px;margin:0;">
      Please arrive 10 minutes before your scheduled time.
      If you need to cancel, please contact us as soon as possible.
    </p>
  `);

  await sendEmail({
    to,
    subject: `${HOSPITAL_NAME} — Appointment Confirmed`,
    html,
  });
}

/**
 * Appointment confirmation (object-param variant —
 * used by appointment API routes)
 */
export async function sendAppointmentConfirmation(data: {
  patientName: string;
  patientEmail: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
}): Promise<void> {
  await sendAppointmentConfirmationEmail(
    data.patientEmail,
    data.patientName,
    data.doctorName,
    data.appointmentDate,
    data.appointmentTime,
    data.reason,
  );
}

/**
 * Appointment cancellation email
 */
export async function sendAppointmentCancellationEmail(
  to: string,
  name: string,
  appointmentDate: string,
  cancelReason: string,
): Promise<void> {
  const html = baseTemplate(`
    <h2 style="color:#dc2626;margin:0 0 16px;">
      Appointment Cancelled
    </h2>
    <p style="color:#475569;margin:0 0 16px;">
      Hello ${name}, your appointment scheduled for
      <strong>${appointmentDate}</strong> at
      <strong>${HOSPITAL_NAME}</strong> has been cancelled.
    </p>
    <p style="color:#475569;margin:0 0 24px;">
      <strong>Reason:</strong> ${cancelReason}
    </p>
    <p style="color:#475569;font-size:13px;margin:0;">
      Please log in to SPRMS or contact us to reschedule.
    </p>
  `);

  await sendEmail({
    to,
    subject: `${HOSPITAL_NAME} — Appointment Cancelled`,
    html,
  });
}

/**
 * Appointment cancellation (object-param variant —
 * used by appointment API routes)
 */
export async function sendAppointmentCancellation(data: {
  patientName: string;
  patientEmail: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
}): Promise<void> {
  await sendAppointmentCancellationEmail(
    data.patientEmail,
    data.patientName,
    data.appointmentDate,
    data.reason,
  );
}

/**
 * 24-hour appointment reminder
 */
export async function sendAppointmentReminderEmail(
  to: string,
  name: string,
  doctorName: string,
  appointmentDate: string,
  appointmentTime: string,
): Promise<void> {
  const html = baseTemplate(`
    <h2 style="color:#1e293b;margin:0 0 16px;">
      Appointment Reminder ⏰
    </h2>
    <p style="color:#475569;margin:0 0 16px;">
      Hello ${name}, this is a reminder that you have an appointment
      tomorrow at <strong>${HOSPITAL_NAME}</strong>.
    </p>

    <table style="background:#f1f5f9;border-radius:6px;padding:20px;
                  width:100%;margin:0 0 24px;">
      <tr>
        <td style="color:#64748b;font-size:13px;padding:6px 0;width:40%;">
          Doctor
        </td>
        <td style="color:#1e293b;font-weight:bold;font-size:13px;
                   padding:6px 0;">
          Dr. ${doctorName}
        </td>
      </tr>
      <tr>
        <td style="color:#64748b;font-size:13px;padding:6px 0;">Date</td>
        <td style="color:#1e293b;font-weight:bold;font-size:13px;
                   padding:6px 0;">
          ${appointmentDate}
        </td>
      </tr>
      <tr>
        <td style="color:#64748b;font-size:13px;padding:6px 0;">Time</td>
        <td style="color:#1e293b;font-weight:bold;font-size:13px;
                   padding:6px 0;">
          ${appointmentTime}
        </td>
      </tr>
    </table>

    <p style="color:#475569;font-size:13px;margin:0;">
      Please arrive 10 minutes before your scheduled time.
    </p>
  `);

  await sendEmail({
    to,
    subject: `${HOSPITAL_NAME} — Appointment Reminder (Tomorrow)`,
    html,
  });
}

/**
 * Prescription ready for collection notification
 */
export async function sendPrescriptionReadyEmail(data: {
  patientName: string;
  patientEmail: string;
  medicationName: string;
  dispensedBy: string;
}): Promise<void> {
  const html = baseTemplate(`
    <h2 style="color:#1e293b;margin:0 0 16px;">
      Prescription Ready for Collection ✓
    </h2>
    <p style="color:#475569;margin:0 0 16px;">
      Dear <strong>${data.patientName}</strong>,
    </p>
    <p style="color:#475569;margin:0 0 24px;">
      Your prescription at <strong>${HOSPITAL_NAME}</strong> has been
      dispensed and is ready for collection from the pharmacy.
    </p>

    <table style="background:#f1f5f9;border-radius:6px;padding:20px;
                  width:100%;margin:0 0 24px;">
      <tr>
        <td style="color:#64748b;font-size:13px;padding:6px 0;width:40%;">
          Medication
        </td>
        <td style="color:#1e293b;font-weight:bold;font-size:13px;
                   padding:6px 0;">
          ${data.medicationName}
        </td>
      </tr>
      <tr>
        <td style="color:#64748b;font-size:13px;padding:6px 0;">
          Dispensed by
        </td>
        <td style="color:#1e293b;font-size:13px;padding:6px 0;">
          ${data.dispensedBy}
        </td>
      </tr>
    </table>

    <p style="color:#475569;font-size:13px;margin:0;">
      Please visit the pharmacy to collect your medication.
      Bring this email or your patient ID card.
    </p>
  `);

  await sendEmail({
    to: data.patientEmail,
    subject: `${HOSPITAL_NAME} — Your Prescription is Ready`,
    html,
  });
}
