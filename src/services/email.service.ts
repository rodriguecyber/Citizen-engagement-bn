import nodemailer from "nodemailer"
import dotenv from 'dotenv'
dotenv.config()
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number.parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD ,
  },
})


// Send email function
export const sendEmail = async (to: string, subject: string, message: string, html?: string) => {
  try {
   
    const mailOptions = {
      from: '"Citizen Engagement Platform" <noreply@citizenengagement.rw>',
      to,
      subject,
      text: message,
      html: html || `<p>${message}</p>`,
    }

    const info = await transporter.sendMail(mailOptions)
    return { success: true, info }
  } catch (error) {
    console.error("Email sending error:", error)
    return { success: false, error }
  }
}

// Generate HTML email template for notification
export const generateNotificationEmail = (title: string, message: string, complaintId?: string, actionUrl?: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        .header {
          background-color: #3b82f6;
          color: white;
          padding: 10px 20px;
          border-radius: 5px 5px 0 0;
        }
        .content {
          padding: 20px;
        }
        .footer {
          border-top: 1px solid #ddd;
          padding: 15px 20px;
          font-size: 12px;
          color: #777;
        }
        .btn {
          display: inline-block;
          background-color: #3b82f6;
          color: white;
          padding: 10px 20px;
          margin: 15px 0;
          text-decoration: none;
          border-radius: 3px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Citizen Engagement Platform</h2>
        </div>
        <div class="content">
          <h3>${title}</h3>
          <p>${message}</p>
          ${complaintId ? `<p>Complaint ID: ${complaintId}</p>` : ""}
          ${
            actionUrl
              ? `<a href="${actionUrl}" class="btn">View Details</a>`
              : `<p>Log in to the platform to view more details.</p>`
          }
        </div>
        <div class="footer">
          <p>This is an automated message from the Citizen Engagement Platform. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `
}
