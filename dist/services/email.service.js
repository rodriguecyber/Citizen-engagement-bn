"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNotificationEmail = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number.parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});
// Send email function
const sendEmail = (to, subject, message, html) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mailOptions = {
            from: '"Citizen Engagement Platform" <noreply@citizenengagement.rw>',
            to,
            subject,
            text: message,
            html: html || `<p>${message}</p>`,
        };
        const info = yield transporter.sendMail(mailOptions);
        return { success: true, info };
    }
    catch (error) {
        console.error("Email sending error:", error);
        return { success: false, error };
    }
});
exports.sendEmail = sendEmail;
// Generate HTML email template for notification
const generateNotificationEmail = (title, message, complaintId, actionUrl) => {
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
          ${actionUrl
        ? `<a href="${actionUrl}" class="btn">View Details</a>`
        : `<p>Log in to the platform to view more details.</p>`}
        </div>
        <div class="footer">
          <p>This is an automated message from the Citizen Engagement Platform. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
exports.generateNotificationEmail = generateNotificationEmail;
