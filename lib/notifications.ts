import { Resend } from 'resend'
import { getDaughterConfig, type Daughter } from './scheduler'
import { format } from 'date-fns'

export async function sendNotifications(
  daughter: Daughter,
  chores: { name: string; description?: string }[],
  method: 'email' | 'sms' | 'both',
  date?: Date
) {
  const config = getDaughterConfig(daughter)
  const dateLabel = format(date || new Date(), 'EEEE, MMMM do')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'
  const dashboardUrl = `${appUrl}/daughter/${daughter}`

  if (chores.length === 0) {
    console.log(`[Notify] No chores for ${config.name} today, skipping`)
    return
  }

  const choreList = chores.map(c => `• ${c.name}`).join('\n')

  if ((method === 'email' || method === 'both') && config.email) {
    await sendEmail(config.name, config.email, dateLabel, chores, dashboardUrl)
  }

  if ((method === 'sms' || method === 'both') && config.phone) {
    await sendSMS(config.name, config.phone, dateLabel, choreList, dashboardUrl)
  }
}

async function sendEmail(
  name: string,
  email: string,
  dateLabel: string,
  chores: { name: string; description?: string }[],
  dashboardUrl: string
) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  const choreRows = chores
    .map(
      c => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8d6;font-size:15px;color:#2d1f0e;">
          ☐ ${c.name}${c.description ? `<br><span style="font-size:13px;color:#8a7560;">${c.description}</span>` : ''}
        </td>
      </tr>`
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fdf8f0;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf8f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:#2d1f0e;padding:32px 36px;">
            <p style="margin:0;font-size:13px;color:#c9a96e;letter-spacing:0.1em;text-transform:uppercase;">Good morning</p>
            <h1 style="margin:8px 0 0;font-size:28px;color:#fdf8f0;font-weight:400;">${name} ✨</h1>
            <p style="margin:6px 0 0;font-size:14px;color:#c9a96e;">${dateLabel}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 20px;font-size:16px;color:#5a4030;line-height:1.6;">
              Here are your chores for today. Check them off as you go!
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${choreRows}
            </table>
            <div style="margin-top:32px;text-align:center;">
              <a href="${dashboardUrl}" style="display:inline-block;background:#2d1f0e;color:#fdf8f0;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;letter-spacing:0.05em;">
                Open my chore list →
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #f0e8d6;text-align:center;">
            <p style="margin:0;font-size:12px;color:#b0a090;">You've got this! 💪</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'chores@yourdomain.com',
    to: email,
    subject: `${name}'s chores for ${dateLabel}`,
    html,
  })

  if (error) console.error('[Email] Failed:', error)
  else console.log(`[Email] Sent to ${email}`)
}

async function sendSMS(
  name: string,
  phone: string,
  dateLabel: string,
  choreList: string,
  dashboardUrl: string
) {
  // Dynamic import so it doesn't crash if Twilio env vars aren't set
  const twilio = require('twilio')
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  )

  const body = `Hi ${name}! 🌟 Your chores for ${dateLabel}:\n\n${choreList}\n\nCheck them off here: ${dashboardUrl}`

  try {
    await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    })
    console.log(`[SMS] Sent to ${phone}`)
  } catch (err) {
    console.error('[SMS] Failed:', err)
  }
}
