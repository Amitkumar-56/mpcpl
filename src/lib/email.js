let transporter = null;
const ADMIN_EMAIL = 'amitk73262@gmail.com';

async function getTransporter() {
  if (transporter) return transporter;
  try {
    const nodemailer = await import('nodemailer');
    transporter = nodemailer.default.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'amitk73262@gmail.com',
        pass: 'oqev kpuv ieoz haii',
      },
    });
    return transporter;
  } catch (e) {
    console.warn("Nodemailer not found. Please run 'npm install nodemailer' to enable emails.");
    return null;
  }
}

/**
 * Send Health Report Email
 */
export async function sendHealthReportEmail(data, recipientEmail = null) {
  try {
    const mailer = await getTransporter();
    if (!mailer) return { success: false, error: "Email service unavailable" };

    const { animal_tag, animal_name, type, disease_name, temperature, symptoms, doctor_name, treatment_date } = data;
    const isFever = parseFloat(temperature) > 102.5;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 20px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">MPCPL Farming - Health Alert</h1>
          <p style="margin: 5px 0 0; font-size: 12px; color: #10b981; font-weight: bold; letter-spacing: 2px;">LIVE DIAGNOSTICS REPORT</p>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px; color: #1e293b;">Animal Information</h2>
          <p>Tag: ${animal_tag} | Species: ${type}</p>
          <p>Status: ${isFever ? 'Fever Detected' : 'Healthy'}</p>
          <hr />
          <p>Doctor: ${doctor_name}</p>
          <p>Date: ${new Date(treatment_date).toLocaleDateString()}</p>
        </div>
      </div>
    `;

    const info = await mailer.sendMail({
      from: `"MPCPL Farming CRM" <${process.env.SMTP_USER || 'no-reply@mpcpl.com'}>`,
      to: recipientEmail || ADMIN_EMAIL,
      cc: recipientEmail ? ADMIN_EMAIL : null,
      subject: `[ALERT] ${isFever ? 'Fever Detected' : 'Health Report'} - Animal ${animal_tag}`,
      html: htmlContent,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending health email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send Generic Farming Report Email
 */
export async function sendGenericReportEmail(title, data, recipientEmail = null, footer_note = "") {
  try {
    const mailer = await getTransporter();
    if (!mailer) return { success: false, error: "Email service unavailable" };

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #0f172a; padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">MPCPL FARMING SOLUTIONS</h1>
          <p style="margin: 5px 0 0; font-size: 14px; color: #10b981; font-weight: bold; text-transform: uppercase;">${title}</p>
        </div>
        <div style="padding: 40px; background-color: #ffffff;">
          <div style="margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #64748b; font-size: 12px; font-weight: bold;">Date: ${new Date().toLocaleDateString('en-IN')}</span>
            <span style="color: #64748b; font-size: 12px; font-weight: bold;">Total Records: ${data.length}</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 12px; text-transform: uppercase;">#</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 12px; text-transform: uppercase;">Description / Tag</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 12px; text-transform: uppercase;">Details / Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((item, i) => `
                <tr style="${i % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;'}">
                  <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 13px;">${i + 1}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px; font-weight: bold;">${item.label}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">${item.value}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; border: 1px solid #dcfce7;">
            <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.6;">
              <strong>Note:</strong> ${footer_note || 'This is an automated operational report generated by the MPCPL Farming CRM System.'}
            </p>
          </div>
          
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 40px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
            © 2026 MPCPL Farming - Confidential Report
          </p>
        </div>
      </div>
    `;

    const info = await mailer.sendMail({
      from: `"MPCPL Farming CRM" <${process.env.SMTP_USER || 'no-reply@mpcpl.com'}>`,
      to: recipientEmail || ADMIN_EMAIL,
      cc: recipientEmail ? ADMIN_EMAIL : null,
      subject: `[REPORT] ${title} - ${new Date().toLocaleDateString()}`,
      html: htmlContent,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending generic report email:", error);
    return { success: false, error: error.message };
  }
}
