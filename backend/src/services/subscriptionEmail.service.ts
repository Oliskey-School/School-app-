import nodemailer from 'nodemailer';

/**
 * Seven subscription email templates (per spec):
 *   1. Payment success       (with invoice PDF attached)
 *   2. 7-day renewal reminder
 *   3. 3-day renewal reminder
 *   4. Term closing day
 *   5. Vacation welcome
 *   6. Top-up charged
 *   7. Payment failed
 *
 * Pure-template module. Email transport is the same one used by EmailService.
 * If SMTP isn't configured, falls back to ethereal test inbox.
 */

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
    if (transporter) return transporter;
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_PASS;
    if (!user || !pass) {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass },
        });
    } else {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass },
        });
    }
    return transporter;
}

const FROM = '"Oliskey Billing" <billing@oliskey.com>';

const fmtNaira = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

const wrap = (title: string, body: string) => `
<div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937;">
  <div style="border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 24px;">
    <h2 style="margin: 0; color: #4f46e5;">${title}</h2>
  </div>
  ${body}
  <p style="margin-top: 32px; color: #9ca3af; font-size: 12px;">Oliskey School Management — Lagos, Nigeria</p>
</div>`;

interface SchoolCtx {
    name: string;
    admin_email: string;
}
interface TermCtx {
    term: number;
    session: string;
    resumption_date: Date | string;
    closing_date: Date | string;
}

export class SubscriptionEmailService {
    /** 1. Payment success — invoice optionally attached. */
    static async sendPaymentSuccess(
        school: SchoolCtx,
        term: TermCtx,
        amount: number,
        invoicePdf?: Buffer
    ) {
        const transport = await getTransporter();
        await transport.sendMail({
            from: FROM,
            to: school.admin_email,
            subject: `Term ${term.term} (${term.session}) activated — ${school.name}`,
            html: wrap('Payment received', `
                <p>Hi ${school.name},</p>
                <p>We've activated <strong>Term ${term.term} — ${term.session}</strong> on your Oliskey account.</p>
                <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
                    <tr><td style="padding: 8px; background: #f3f4f6;">Amount paid</td><td style="padding: 8px; font-weight: bold;">${fmtNaira(amount)}</td></tr>
                    <tr><td style="padding: 8px;">Access from</td><td style="padding: 8px;">${fmtDate(term.resumption_date)}</td></tr>
                    <tr><td style="padding: 8px; background: #f3f4f6;">Access until</td><td style="padding: 8px;">${fmtDate(term.closing_date)}</td></tr>
                </table>
                <p>Your invoice is attached as a PDF.</p>
            `),
            attachments: invoicePdf
                ? [{ filename: `oliskey-invoice-term${term.term}-${term.session.replace('/', '-')}.pdf`, content: invoicePdf }]
                : []
        });
    }

    /** 2. 7-day renewal reminder. */
    static async send7DayReminder(school: SchoolCtx, term: TermCtx, nextTerm?: TermCtx) {
        const transport = await getTransporter();
        await transport.sendMail({
            from: FROM,
            to: school.admin_email,
            subject: `Renew before Term ${term.term} closes (7 days left)`,
            html: wrap('7 days left on your plan', `
                <p>Your Oliskey plan for <strong>Term ${term.term} — ${term.session}</strong> closes on <strong>${fmtDate(term.closing_date)}</strong>.</p>
                ${nextTerm
                    ? `<p>Renew now to be ready for <strong>Term ${nextTerm.term}</strong> starting ${fmtDate(nextTerm.resumption_date)}.</p>`
                    : `<p>Renew now to avoid disruption.</p>`}
                <a href="${process.env.APP_URL || ''}/#/subscription" style="display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Renew now</a>
            `)
        });
    }

    /** 3. 3-day renewal reminder. */
    static async send3DayReminder(school: SchoolCtx, term: TermCtx) {
        const transport = await getTransporter();
        await transport.sendMail({
            from: FROM,
            to: school.admin_email,
            subject: `3 days left on Term ${term.term} — renew before ${fmtDate(term.closing_date)}`,
            html: wrap('3 days left — renew now', `
                <p>Only <strong>3 days remain</strong> on Term ${term.term} (${term.session}). After ${fmtDate(term.closing_date)} your account will downgrade to Free until you renew.</p>
                <a href="${process.env.APP_URL || ''}/#/subscription" style="display: inline-block; background: #dc2626; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Renew now</a>
            `)
        });
    }

    /** 4. Term has ended (day of closing). */
    static async sendTermEnded(school: SchoolCtx, term: TermCtx, nextTerm?: TermCtx) {
        const transport = await getTransporter();
        await transport.sendMail({
            from: FROM,
            to: school.admin_email,
            subject: `Term ${term.term} (${term.session}) has ended`,
            html: wrap('Your term has ended', `
                <p>Term ${term.term} closed today. Your Oliskey account has been downgraded to the Free plan.</p>
                ${nextTerm
                    ? `<p><strong>Term ${nextTerm.term}</strong> resumes ${fmtDate(nextTerm.resumption_date)}. Renew now to be active from day one.</p>`
                    : ''}
                <a href="${process.env.APP_URL || ''}/#/subscription" style="display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Renew subscription</a>
            `)
        });
    }

    /** 5. Vacation welcome — sent the first time the school opens the app during vacation. */
    static async sendVacationWelcome(school: SchoolCtx, nextTerm: TermCtx) {
        const transport = await getTransporter();
        await transport.sendMail({
            from: FROM,
            to: school.admin_email,
            subject: `Welcome back — Term ${nextTerm.term} starts ${fmtDate(nextTerm.resumption_date)}`,
            html: wrap('Welcome back to Oliskey', `
                <p>Term ${nextTerm.term} (${nextTerm.session}) resumes on <strong>${fmtDate(nextTerm.resumption_date)}</strong>.</p>
                <p>Pay now so your school is ready from day one.</p>
                <a href="${process.env.APP_URL || ''}/#/subscription" style="display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Activate Term ${nextTerm.term}</a>
            `)
        });
    }

    /** 6. Top-up charged for additional students. */
    static async sendTopUpCharged(
        school: SchoolCtx,
        amount: number,
        extraStudents: number,
        newTotalStudents: number,
        term: TermCtx
    ) {
        const transport = await getTransporter();
        await transport.sendMail({
            from: FROM,
            to: school.admin_email,
            subject: `Charged ${fmtNaira(amount)} for ${extraStudents} additional students`,
            html: wrap('Top-up successful', `
                <p>We charged your saved card <strong>${fmtNaira(amount)}</strong> for ${extraStudents} additional student${extraStudents === 1 ? '' : 's'} on Term ${term.term}.</p>
                <p>Your new student count is <strong>${newTotalStudents}</strong>. No proration — full term rate applies regardless of when in the term students are added.</p>
            `)
        });
    }

    /** 7. Payment failed — update card. */
    static async sendPaymentFailed(school: SchoolCtx, reason?: string) {
        const transport = await getTransporter();
        await transport.sendMail({
            from: FROM,
            to: school.admin_email,
            subject: 'Payment failed — update your payment method',
            html: wrap('Payment failed', `
                <p>We couldn't process your payment${reason ? ` (${reason})` : ''}. Please update your payment method to restore access.</p>
                <a href="${process.env.APP_URL || ''}/#/subscription" style="display: inline-block; background: #dc2626; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Update payment method</a>
            `)
        });
    }
}
