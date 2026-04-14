// src/app/api/hr-letters/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET - Generate HR Letter PDF
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const letterType = searchParams.get('type');
    const employeeId = searchParams.get('employee_id');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const includePF = searchParams.get('include_pf') === 'true'; // Default to true if not specified

    // Get current user
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const currentUserId = decoded.userId || decoded.id;

    const userInfo = await executeQuery(
      `SELECT role FROM employee_profile WHERE id = ?`,
      [currentUserId]
    );

    if (!userInfo || userInfo.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const userRole = parseInt(userInfo[0].role) || 0;

    if (userRole < 3) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Only Admin, Accountant, and Team Leader can generate HR letters.' },
        { status: 403 }
      );
    }

    if (!letterType || !employeeId) {
      return NextResponse.json(
        { success: false, error: 'Letter type and employee ID are required' },
        { status: 400 }
      );
    }

    const employee = await executeQuery(
      `SELECT id, name, emp_code, email, phone, salary
       FROM employee_profile WHERE id = ?`,
      [employeeId]
    );

    if (!employee || employee.length === 0) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    const employeeData = employee[0];

    const companyDetails = {
      name: 'GYANTI',
      fullName: 'Gyanti Multiservices Pvt Ltd',
      address: 'NAKHA NO 1, MOHARIPUR, GORAKHPUR - 273001',
      phone: '+91-7311112659',
      email: 'info@gyanti.com',
      website: 'www.gyanti.com',
      cin: 'UXXXXXXXXXXUP2023PTCXXXXXX',
      gstin: '09XXXXXXXXXXGST001'
    };

    let letterContent = '';
    let fileName = '';

    const currentDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    switch (letterType) {
      case 'offer':
        letterContent = generateOfferLetter(employeeData, companyDetails, currentDate);
        fileName = `Offer_Letter_${employeeData.name}_${Date.now()}.pdf`;
        break;
      case 'appointment':
        letterContent = generateAppointmentLetter(employeeData, companyDetails, currentDate);
        fileName = `Appointment_Letter_${employeeData.name}_${Date.now()}.pdf`;
        break;
      case 'joining':
        letterContent = generateJoiningLetter(employeeData, companyDetails, currentDate);
        fileName = `Joining_Letter_${employeeData.name}_${Date.now()}.pdf`;
        break;
      case 'agreement':
        letterContent = generateAgreementLetter(employeeData, companyDetails, currentDate);
        fileName = `Agreement_Letter_${employeeData.name}_${Date.now()}.pdf`;
        break;
      case 'salary':
        if (!month || !year) {
          return NextResponse.json(
            { success: false, error: 'Month and year are required for salary slip' },
            { status: 400 }
          );
        }
        letterContent = await generateSalarySlip(employeeData, companyDetails, currentDate, month, year, includePF);
        fileName = `Salary_Slip_${employeeData.name}_${month}_${year}.pdf`;
        break;
      case 'termination':
        letterContent = generateTerminationLetter(employeeData, companyDetails, currentDate);
        fileName = `Termination_Letter_${employeeData.name}_${Date.now()}.pdf`;
        break;
      case 'relieving':
        letterContent = generateRelievingLetter(employeeData, companyDetails, currentDate);
        fileName = `Relieving_Letter_${employeeData.name}_${Date.now()}.pdf`;
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid letter type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        content: letterContent,
        fileName: fileName,
        employee: employeeData,
        company: companyDetails
      }
    });

  } catch (error) {
    console.error('Error generating HR letter:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
function getSharedStyles(accentColor = '#1a3c5e', accentLight = '#e8f0f7') {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Serif+4:wght@300;400;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: 'Source Serif 4', Georgia, serif;
      font-size: 10pt;
      color: #1a1a2e;
      background: #fff;
      line-height: 1.7;
    }
    .page {
      width: 210mm;
      min-height: 277mm;
      margin: 0 auto;
      padding: 10mm 15mm 15mm 15mm;
      position: relative;
      background: #fff;
      page-break-inside: avoid;
      overflow: visible;
    }

    /* ── Header ── */
    .letter-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 8mm;
      border-bottom: 3px solid ${accentColor};
      margin-bottom: 6mm;
    }
    .company-brand { flex: 1; }
    .company-name-big {
      font-family: 'Playfair Display', serif;
      font-size: 22pt;
      font-weight: 700;
      color: ${accentColor};
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .company-name-sub {
      font-size: 8pt;
      color: #666;
      font-weight: 300;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .company-meta {
      text-align: right;
      font-size: 8pt;
      color: #555;
      line-height: 1.8;
    }
    .company-meta strong { color: ${accentColor}; }

    /* ── Accent stripe ── */
    .accent-bar {
      height: 4px;
      background: linear-gradient(90deg, ${accentColor} 0%, #4a90b8 50%, ${accentLight} 100%);
      border-radius: 2px;
      margin-bottom: 6mm;
    }

    /* ── Document Title Block ── */
    .doc-title-block {
      background: ${accentColor};
      color: #fff;
      padding: 5mm 8mm;
      border-radius: 4px;
      margin-bottom: 6mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .doc-title-block h1 {
      font-family: 'Playfair Display', serif;
      font-size: 14pt;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .doc-ref {
      font-size: 8pt;
      opacity: 0.8;
      font-weight: 300;
      letter-spacing: 0.5px;
    }

    /* ── Meta row ── */
    .meta-row {
      display: flex;
      gap: 6mm;
      margin-bottom: 5mm;
    }
    .meta-item {
      background: ${accentLight};
      border-left: 3px solid ${accentColor};
      padding: 2mm 4mm;
      border-radius: 0 3px 3px 0;
      flex: 1;
    }
    .meta-label { font-size: 7pt; color: #888; text-transform: uppercase; letter-spacing: 0.8px; }
    .meta-value { font-size: 9pt; font-weight: 600; color: ${accentColor}; margin-top: 1px; }

    /* ── Addressee ── */
    .addressee {
      margin-bottom: 5mm;
      padding: 4mm 5mm;
      border: 1px solid #e0e8f0;
      border-radius: 4px;
      background: #fafbfe;
    }
    .addressee-label {
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #999;
      margin-bottom: 2mm;
    }
    .addressee-name {
      font-family: 'Playfair Display', serif;
      font-size: 12pt;
      color: ${accentColor};
      font-weight: 600;
    }
    .addressee-details { font-size: 9pt; color: #444; margin-top: 1mm; line-height: 1.6; }

    /* ── Body ── */
    .salutation { font-size: 10pt; margin-bottom: 3mm; font-weight: 600; }
    .body-text { font-size: 10pt; margin-bottom: 3mm; color: #333; text-align: justify; }

    /* ── Info Box ── */
    .info-box {
      background: ${accentLight};
      border: 1px solid #c8daea;
      border-radius: 4px;
      padding: 4mm 5mm;
      margin: 4mm 0;
    }
    .info-box-title {
      font-family: 'Playfair Display', serif;
      font-size: 9pt;
      color: ${accentColor};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 3mm;
      padding-bottom: 2mm;
      border-bottom: 1px solid #c8daea;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5mm 8mm;
    }
    .info-row { display: flex; gap: 2mm; align-items: baseline; }
    .info-key { font-size: 8.5pt; color: #666; min-width: 110px; }
    .info-val { font-size: 8.5pt; color: #111; font-weight: 600; }

    /* ── Signature block ── */
    .signature-section {
      margin-top: 8mm;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .sig-block { text-align: center; }
    .sig-line {
      width: 50mm;
      border-bottom: 1.5px solid #aaa;
      margin-bottom: 2mm;
    }
    .sig-name { font-size: 9pt; font-weight: 600; color: ${accentColor}; }
    .sig-title { font-size: 8pt; color: #777; }
    .company-seal {
      width: 20mm;
      height: 20mm;
      border: 2px solid ${accentColor};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7pt;
      font-weight: 700;
      color: ${accentColor};
      text-align: center;
      letter-spacing: 0.5px;
      opacity: 0.5;
    }

    /* ── Footer ── */
    .letter-footer {
      position: fixed;
      bottom: 8mm;
      left: 15mm;
      right: 15mm;
      border-top: 1px solid #dde3ea;
      padding-top: 2mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-text { font-size: 7pt; color: #aaa; }
    .footer-brand { font-size: 7pt; color: ${accentColor}; font-weight: 600; letter-spacing: 0.5px; }

    /* ── Print ── */
    @media print {
      body { margin: 0; font-size: 9pt; }
      .page { 
        margin: 0; 
        padding: 8mm 12mm; 
        page-break-inside: avoid;
        overflow: visible;
        min-height: 277mm;
      }
      @page { 
        size: A4; 
        margin: 0;
        orphans: 3;
        widows: 3;
      }
      .signature-section {
        page-break-inside: avoid;
        margin-top: 6mm;
        position: relative;
      }
      .info-box {
        page-break-inside: avoid;
        margin: 3mm 0;
      }
      .body-text {
        font-size: 9pt;
        line-height: 1.5;
      }
      .company-meta {
        font-size: 7pt;
      }
    }
  `;
}

// ─── Shared header HTML ───────────────────────────────────────────────────────
function letterHeader(company) {
  return `
  <div class="letter-header">
    <div class="company-brand">
      <div class="company-name-big">${company.name}</div>
      <div class="company-name-sub">${company.fullName}</div>
    </div>
    <div class="company-meta">
      <div>${company.address}</div>
      <div><strong>T:</strong> ${company.phone} &nbsp;|&nbsp; <strong>E:</strong> ${company.email}</div>
      <div><strong>W:</strong> ${company.website}</div>
      <div><strong>CIN:</strong> ${company.cin}</div>
    </div>
  </div>`;
}

// ─── Shared footer HTML ───────────────────────────────────────────────────────
function letterFooter(company) {
  return `
  <div class="letter-footer">
    <span class="footer-text">This is a computer-generated document. For verification, contact HR.</span>
    <span class="footer-brand">${company.name} &mdash; ${company.fullName}</span>
  </div>`;
}

// ─── Offer Letter ─────────────────────────────────────────────────────────────
function generateOfferLetter(employee, company, date) {
  const annual = parseFloat(employee.salary || 0);
  const monthly = annual / 12;
  const basic = monthly * 0.5;
  const hra = monthly * 0.15;
  const allowances = monthly * 0.35;
  const fmt = (n) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const refNo = `GYANTI/HR/OL/${new Date().getFullYear()}/${String(employee.id).padStart(4, '0')}`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
  <title>Offer Letter — ${employee.name}</title>
  <style>${getSharedStyles('#1a3c5e', '#e8f0f7')}</style></head>
  <body><div class="page">
    ${letterHeader(company)}
    <div class="accent-bar"></div>

    <div class="doc-title-block">
      <h1>Offer Letter</h1>
      <span class="doc-ref">Ref: ${refNo} &nbsp;|&nbsp; Date: ${date}</span>
    </div>

    <div class="meta-row">
      <div class="meta-item"><div class="meta-label">Employee Code</div><div class="meta-value">${employee.emp_code}</div></div>
      <div class="meta-item"><div class="meta-label">Issue Date</div><div class="meta-value">${date}</div></div>
      <div class="meta-item"><div class="meta-label">Annual CTC</div><div class="meta-value">₹ ${fmt(annual)}</div></div>
    </div>

    <div class="addressee">
      <div class="addressee-label">Addressed To</div>
      <div class="addressee-name">${employee.name}</div>
      <div class="addressee-details">
        ${'Address not available'}<br>
        📧 ${employee.email} &nbsp;&nbsp; 📞 ${employee.phone}
      </div>
    </div>

    <p class="salutation">Dear ${employee.name},</p>

    <p class="body-text">
      We are pleased to extend an offer of employment to you for the position of <strong>${employee.designation || 'Employee'}</strong>
      at <strong>${company.fullName}</strong>. After careful consideration, we believe your skills and
      experience will make a valuable addition to our team.
    </p>

    <div class="info-box">
      <div class="info-box-title">📋 Employment Details</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-key">Position</span><span class="info-val">${employee.designation || 'Employee'}</span></div>
        <div class="info-row"><span class="info-key">Department</span><span class="info-val">${employee.department || 'General'}</span></div>
        <div class="info-row"><span class="info-key">Employee Code</span><span class="info-val">${employee.emp_code}</span></div>
        <div class="info-row"><span class="info-key">Proposed Start Date</span><span class="info-val">${date}</span></div>
        <div class="info-row"><span class="info-key">Employment Type</span><span class="info-val">Permanent, Full-Time</span></div>
        <div class="info-row"><span class="info-key">Work Location</span><span class="info-val">${company.address}</span></div>
      </div>
    </div>

    <div class="info-box">
      <div class="info-box-title">💰 Compensation & Benefits</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-key">Annual CTC</span><span class="info-val">₹ ${fmt(annual)}</span></div>
        <div class="info-row"><span class="info-key">Monthly Gross</span><span class="info-val">₹ ${fmt(monthly)}</span></div>
        <div class="info-row"><span class="info-key">Basic Salary</span><span class="info-val">₹ ${fmt(basic)}</span></div>
        <div class="info-row"><span class="info-key">HRA</span><span class="info-val">₹ ${fmt(hra)}</span></div>
        <div class="info-row"><span class="info-key">Other Allowances</span><span class="info-val">₹ ${fmt(allowances)}</span></div>
        <div class="info-row"><span class="info-key">Provident Fund</span><span class="info-val">As per company policy</span></div>
      </div>
    </div>

    <p class="body-text">
      This offer is contingent upon your acceptance of the terms and conditions, successful completion of background
      verification, and submission of all required documents. Please confirm your acceptance by signing and returning
      a copy of this letter within <strong>7 days</strong>.
    </p>
    <p class="body-text">We look forward to welcoming you to the <strong>${company.name}</strong> family.</p>

    <div class="signature-section">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">${employee.name}</div>
        <div class="sig-title">Candidate Acceptance</div>
      </div>
      <div class="company-seal">GYANTI<br>SEAL</div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">HR Manager</div>
        <div class="sig-title">${company.fullName}</div>
      </div>
    </div>

    ${letterFooter(company)}
  </div></body></html>`;
}

// ─── Appointment Letter ───────────────────────────────────────────────────────
function generateAppointmentLetter(employee, company, date) {
  const annual = parseFloat(employee.salary || 0);
  const monthly = annual / 12;
  const basic = monthly * 0.5;
  const hra = monthly * 0.15;
  const allowances = monthly * 0.35;
  const fmt = (n) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const refNo = `GYANTI/HR/APT/${new Date().getFullYear()}/${String(employee.id).padStart(4, '0')}`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
  <title>Appointment Letter — ${employee.name}</title>
  <style>${getSharedStyles('#1a3c5e', '#e8f0f7')}</style></head>
  <body><div class="page">
    ${letterHeader(company)}
    <div class="accent-bar"></div>

    <div class="doc-title-block">
      <h1>Appointment Letter</h1>
      <span class="doc-ref">Ref: ${refNo} &nbsp;|&nbsp; Date: ${date}</span>
    </div>

    <div class="meta-row">
      <div class="meta-item"><div class="meta-label">Employee Code</div><div class="meta-value">${employee.emp_code}</div></div>
      <div class="meta-item"><div class="meta-label">Date of Joining</div><div class="meta-value">${date}</div></div>
      <div class="meta-item"><div class="meta-label">Annual CTC</div><div class="meta-value">₹ ${fmt(annual)}</div></div>
    </div>

    <div class="addressee">
      <div class="addressee-label">Addressed To</div>
      <div class="addressee-name">${employee.name}</div>
      <div class="addressee-details">
        ${'Address not available'}<br>
        📧 ${employee.email} &nbsp;&nbsp; 📞 ${employee.phone}
      </div>
    </div>

    <p class="salutation">Dear ${employee.name},</p>

    <p class="body-text">
      We are delighted to confirm your appointment as <strong>${employee.designation || 'Employee'}</strong> in the
      <strong>${employee.department || 'General'}</strong> department at <strong>${company.fullName}</strong>,
      with effect from <strong>${date}</strong>. Your appointment is subject to the terms and conditions mentioned below.
    </p>

    <div class="info-box">
      <div class="info-box-title">📋 Appointment Terms</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-key">Employee Code</span><span class="info-val">${employee.emp_code}</span></div>
        <div class="info-row"><span class="info-key">Designation</span><span class="info-val">${employee.designation || 'Employee'}</span></div>
        <div class="info-row"><span class="info-key">Department</span><span class="info-val">${employee.department || 'General'}</span></div>
        <div class="info-row"><span class="info-key">Employment Type</span><span class="info-val">Permanent</span></div>
        <div class="info-row"><span class="info-key">Probation Period</span><span class="info-val">6 Months</span></div>
        <div class="info-row"><span class="info-key">Working Hours</span><span class="info-val">9:30 AM – 6:30 PM</span></div>
        <div class="info-row"><span class="info-key">Working Days</span><span class="info-val">Monday to Saturday</span></div>
        <div class="info-row"><span class="info-key">Reporting To</span><span class="info-val">Department Head</span></div>
      </div>
    </div>

    <div class="info-box">
      <div class="info-box-title">💰 Salary Structure (Monthly)</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-key">Annual CTC</span><span class="info-val">₹ ${fmt(annual)}</span></div>
        <div class="info-row"><span class="info-key">Monthly Gross</span><span class="info-val">₹ ${fmt(monthly)}</span></div>
        <div class="info-row"><span class="info-key">Basic Salary (50%)</span><span class="info-val">₹ ${fmt(basic)}</span></div>
        <div class="info-row"><span class="info-key">HRA (15%)</span><span class="info-val">₹ ${fmt(hra)}</span></div>
        <div class="info-row"><span class="info-key">Other Allowances (35%)</span><span class="info-val">₹ ${fmt(allowances)}</span></div>
        <div class="info-row"><span class="info-key">PF Contribution</span><span class="info-val">As per policy</span></div>
      </div>
    </div>

    <p class="body-text">
      During the probation period, your performance will be evaluated. Upon satisfactory completion, your appointment
      shall be confirmed. Any extension of probation or premature confirmation shall be communicated in writing.
    </p>
    <p class="body-text">Welcome to <strong>${company.name}</strong>. We wish you a successful and rewarding career with us.</p>

    <div class="signature-section">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">${employee.name}</div>
        <div class="sig-title">Employee Signature</div>
      </div>
      <div class="company-seal">GYANTI<br>SEAL</div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">HR Manager</div>
        <div class="sig-title">${company.fullName}</div>
      </div>
    </div>

    ${letterFooter(company)}
  </div></body></html>`;
}

// ─── Joining Letter ───────────────────────────────────────────────────────────
function generateJoiningLetter(employee, company, date) {
  const refNo = `GYANTI/HR/JL/${new Date().getFullYear()}/${String(employee.id).padStart(4, '0')}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
  <title>Joining Letter — ${employee.name}</title>
  <style>${getSharedStyles('#1e4d2b', '#eaf3ec')}</style></head>
  <body><div class="page">
    ${letterHeader({ ...company, name: company.name })}
    <div class="accent-bar" style="background: linear-gradient(90deg, #1e4d2b 0%, #3a7d44 50%, #eaf3ec 100%);"></div>

    <div class="doc-title-block" style="background:#1e4d2b;">
      <h1>Joining Letter</h1>
      <span class="doc-ref">Ref: ${refNo} &nbsp;|&nbsp; Date: ${date}</span>
    </div>

    <div class="meta-row">
      <div class="meta-item" style="border-left-color:#1e4d2b;background:#eaf3ec;">
        <div class="meta-label">Employee Code</div><div class="meta-value" style="color:#1e4d2b;">${employee.emp_code}</div>
      </div>
      <div class="meta-item" style="border-left-color:#1e4d2b;background:#eaf3ec;">
        <div class="meta-label">Date of Joining</div><div class="meta-value" style="color:#1e4d2b;">${date}</div>
      </div>
      <div class="meta-item" style="border-left-color:#1e4d2b;background:#eaf3ec;">
        <div class="meta-label">Department</div><div class="meta-value" style="color:#1e4d2b;">${employee.department || 'General'}</div>
      </div>
    </div>

    <div class="addressee" style="border-color:#c5dfc9;background:#f5fbf6;">
      <div class="addressee-label">Addressed To</div>
      <div class="addressee-name" style="color:#1e4d2b;">${employee.name}</div>
      <div class="addressee-details">
        Employee Code: ${employee.emp_code} &nbsp;|&nbsp; ${employee.designation || 'Employee'}<br>
        📧 ${employee.email} &nbsp;&nbsp; 📞 ${employee.phone}
      </div>
    </div>

    <p class="salutation">Dear ${employee.name},</p>

    <p class="body-text">
      🎉 A very warm welcome to <strong>${company.fullName}</strong>! We are thrilled to have you on board.
      Your joining formalities have been successfully completed, and you are now officially a valued member of
      our organization as <strong>${employee.designation || 'Employee'}</strong> in the
      <strong>${employee.department || 'General'}</strong> department.
    </p>

    <div class="info-box" style="background:#eaf3ec;border-color:#b5d8bb;">
      <div class="info-box-title" style="color:#1e4d2b;border-color:#b5d8bb;">🗂️ Joining Details</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-key">Date of Joining</span><span class="info-val">${date}</span></div>
        <div class="info-row"><span class="info-key">Employee Code</span><span class="info-val">${employee.emp_code}</span></div>
        <div class="info-row"><span class="info-key">Designation</span><span class="info-val">${employee.designation || 'Employee'}</span></div>
        <div class="info-row"><span class="info-key">Department</span><span class="info-val">${employee.department || 'General'}</span></div>
        <div class="info-row"><span class="info-key">Email</span><span class="info-val">${employee.email}</span></div>
        <div class="info-row"><span class="info-key">Phone</span><span class="info-val">${employee.phone}</span></div>
      </div>
    </div>

    <div class="info-box" style="background:#eaf3ec;border-color:#b5d8bb;">
      <div class="info-box-title" style="color:#1e4d2b;border-color:#b5d8bb;">✅ Important Information</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-key">Probation Period</span><span class="info-val">6 Months</span></div>
        <div class="info-row"><span class="info-key">Working Hours</span><span class="info-val">9:30 AM – 6:30 PM</span></div>
        <div class="info-row"><span class="info-key">Documentation Deadline</span><span class="info-val">Within first week</span></div>
        <div class="info-row"><span class="info-key">Mentor Assignment</span><span class="info-val">First 30 days</span></div>
      </div>
    </div>

    <p class="body-text">
      We are excited about your contributions to our organization's growth. Should you need any assistance,
      please contact the HR department at <strong>${company.email}</strong>.
    </p>
    <p class="body-text" style="font-weight:600;color:#1e4d2b;">Once again, welcome aboard! 🌟</p>

    <div class="signature-section">
      <div class="sig-block">
        <div class="sig-line" style="border-color:#1e4d2b;"></div>
        <div class="sig-name" style="color:#1e4d2b;">${employee.name}</div>
        <div class="sig-title">Employee Signature</div>
      </div>
      <div class="company-seal" style="border-color:#1e4d2b;color:#1e4d2b;">MPCPL<br>SEAL</div>
      <div class="sig-block">
        <div class="sig-line" style="border-color:#1e4d2b;"></div>
        <div class="sig-name" style="color:#1e4d2b;">HR Manager</div>
        <div class="sig-title">${company.fullName}</div>
      </div>
    </div>

    ${letterFooter(company)}
  </div></body></html>`;
}

// ─── Employment Agreement ─────────────────────────────────────────────────────
function generateAgreementLetter(employee, company, date) {
  const annual = parseFloat(employee.salary || 0);
  const fmt = (n) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const refNo = `GYANTI/HR/AGR/${new Date().getFullYear()}/${String(employee.id).padStart(4, '0')}`;

  const terms = [
    ['Employment Period', 'This agreement is effective from the date of joining and shall continue until terminated by either party as per terms herein.'],
    ['Probation Period', 'The Employee shall be on probation for 6 months. During this period the employment may be terminated by either party with 7 days notice.'],
    ['Job Responsibilities', `The Employee shall perform duties as assigned by the Company related to the position of ${employee.designation || 'Employee'} and any other tasks as may be assigned from time to time.`],
    ['Working Hours', 'Standard working hours are 9:30 AM to 6:30 PM, Monday to Saturday. Overtime, if required, shall be compensated as per company policy.'],
    ['Compensation', `The Employee shall receive an Annual CTC of ₹${fmt(annual)}, payable monthly as per the agreed salary structure.`],
    ['Confidentiality', 'The Employee shall maintain strict confidentiality of all proprietary information, trade secrets, client data, and business affairs of the Company.'],
    ['Non-Compete', 'During and for one year after employment, the Employee shall not engage with direct competitors without prior written consent of the Company.'],
    ['Leave Policy', 'The Employee shall be entitled to leaves as per the Company Leave Policy. Unauthorized absence shall be treated as loss of pay.'],
    ['Termination', 'Post probation, either party may terminate this agreement with 30 days written notice or payment in lieu of notice.'],
    ['Governing Law', 'This agreement shall be governed by the laws of India and subject to the exclusive jurisdiction of courts in Mumbai.'],
  ];

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
  <title>Employment Agreement — ${employee.name}</title>
  <style>
    ${getSharedStyles('#3d1a6e', '#f0ebf8')}
    .terms-list { counter-reset: terms; margin: 3mm 0; }
    .term-item {
      counter-increment: terms;
      display: flex;
      gap: 3mm;
      margin-bottom: 2.5mm;
      align-items: flex-start;
    }
    .term-num {
      background: #3d1a6e;
      color: #fff;
      width: 5mm;
      height: 5mm;
      border-radius: 50%;
      font-size: 7pt;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1mm;
    }
    .term-text { font-size: 9pt; color: #333; }
    .term-text strong { color: #3d1a6e; }
    .parties-box {
      display: flex;
      gap: 4mm;
      margin: 4mm 0;
    }
    .party {
      flex: 1;
      padding: 3mm 4mm;
      border: 1px solid #c5b0e0;
      border-radius: 4px;
      background: #f0ebf8;
    }
    .party-role { font-size: 7pt; text-transform: uppercase; letter-spacing: 1px; color: #9b7ec8; margin-bottom: 1mm; }
    .party-name { font-size: 10pt; font-weight: 700; color: #3d1a6e; }
    .party-detail { font-size: 8pt; color: #555; margin-top: 0.5mm; }
  </style></head>
  <body><div class="page">
    ${letterHeader(company)}
    <div class="accent-bar" style="background: linear-gradient(90deg, #3d1a6e 0%, #7c4db8 50%, #f0ebf8 100%);"></div>

    <div class="doc-title-block" style="background:#3d1a6e;">
      <h1>Employment Agreement</h1>
      <span class="doc-ref">Ref: ${refNo} &nbsp;|&nbsp; Date: ${date}</span>
    </div>

    <p class="body-text">This Employment Agreement ("Agreement") is entered into on <strong>${date}</strong>, between:</p>

    <div class="parties-box">
      <div class="party">
        <div class="party-role">The Company (Employer)</div>
        <div class="party-name">${company.fullName}</div>
        <div class="party-detail">${company.address}<br>CIN: ${company.cin}</div>
      </div>
      <div class="party">
        <div class="party-role">The Employee</div>
        <div class="party-name">${employee.name}</div>
        <div class="party-detail">Code: ${employee.emp_code}<br>${employee.email}</div>
      </div>
    </div>

    <div class="info-box" style="background:#f0ebf8;border-color:#c5b0e0;">
      <div class="info-box-title" style="color:#3d1a6e;border-color:#c5b0e0;">👤 Employee Particulars</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-key">Full Name</span><span class="info-val">${employee.name}</span></div>
        <div class="info-row"><span class="info-key">Employee Code</span><span class="info-val">${employee.emp_code}</span></div>
        <div class="info-row"><span class="info-key">Designation</span><span class="info-val">${employee.designation || 'Employee'}</span></div>
        <div class="info-row"><span class="info-key">Department</span><span class="info-val">${employee.department || 'General'}</span></div>
        <div class="info-row"><span class="info-key">Date of Joining</span><span class="info-val">${date}</span></div>
        <div class="info-row"><span class="info-key">Annual CTC</span><span class="info-val">₹ ${fmt(annual)}</span></div>
      </div>
    </div>

    <div class="info-box" style="background:#f0ebf8;border-color:#c5b0e0;">
      <div class="info-box-title" style="color:#3d1a6e;border-color:#c5b0e0;">📜 Terms & Conditions</div>
      <div class="terms-list">
        ${terms.map((t, i) => `
          <div class="term-item">
            <div class="term-num">${i + 1}</div>
            <div class="term-text"><strong>${t[0]}:</strong> ${t[1]}</div>
          </div>`).join('')}
      </div>
    </div>

    <p class="body-text">
      By signing below, both parties acknowledge that they have read, understood, and agree to be bound
      by all terms and conditions outlined in this Agreement.
    </p>

    <div class="signature-section">
      <div class="sig-block">
        <div class="sig-line" style="border-color:#3d1a6e;"></div>
        <div class="sig-name" style="color:#3d1a6e;">${employee.name}</div>
        <div class="sig-title">Employee</div>
      </div>
      <div class="company-seal" style="border-color:#3d1a6e;color:#3d1a6e;">GYANTI<br>SEAL</div>
      <div class="sig-block">
        <div class="sig-line" style="border-color:#3d1a6e;"></div>
        <div class="sig-name" style="color:#3d1a6e;">Authorized Signatory</div>
        <div class="sig-title">${company.fullName}</div>
      </div>
    </div>

    ${letterFooter(company)}
  </div></body></html>`;
}

// ─── Salary Slip ──────────────────────────────────────────────────────────────
async function generateSalarySlip(employee, company, date, month, year, includePF = true) {
  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' });
  const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const refNo = `GYANTI/SAL/${year}/${String(month).padStart(2, '0')}/${String(employee.id).padStart(4, '0')}`;

  // Fetch attendance summary data for the employee (should be updated when daily attendance is marked)
  const attendanceSummary = await executeQuery(
    `SELECT total_days, present_days, absent_days, leave_days, half_days, worked_days 
     FROM attendance_summary 
     WHERE employee_id = ? AND month = ? AND year = ?`,
    [employee.id, month, year]
  );

  const attendanceData = attendanceSummary && attendanceSummary.length > 0 ? attendanceSummary[0] : {
    total_days: 30,
    present_days: 30,
    absent_days: 0,
    leave_days: 0,
    half_days: 0,
    worked_days: 30
  };

  const totalDays = attendanceData.total_days || 30;
  const presentDays = attendanceData.present_days || 30;

  // Calculate salary components from base salary
  const baseSalary = parseFloat(employee.salary) || 25000;
  const basicSalary = baseSalary * 0.4; // 40% Basic
  const hra = baseSalary * 0.2; // 20% HRA
  const foodAllowance = baseSalary * 0.15; // 15% Food
  const fixedIncentive = baseSalary * 0.25; // 25% Incentive
  const grossSalary = basicSalary + hra + foodAllowance + fixedIncentive;

  // Calculate earned salary based on attendance
  const perDaySalary = grossSalary / totalDays;
  const earnedGrossSalary = perDaySalary * presentDays;
  
  // Calculate earned components based on attendance
  const earnedBasic = (basicSalary / totalDays) * presentDays;
  const earnedHRA = (hra / totalDays) * presentDays;
  const earnedFood = (foodAllowance / totalDays) * presentDays;
  const earnedIncentive = (fixedIncentive / totalDays) * presentDays;

  // Calculate deductions based on earned salary
  const pfDeduction = includePF ? earnedBasic * 0.12 : 0; // 12% PF on earned Basic (only if includePF is true)
  const esiDeduction = includePF ? Math.min(earnedGrossSalary * 0.0075, 750) : 0; // 0.75% ESI on earned gross, max 750 (only if includePF is true)
  const tdsDeduction = 0; // Can be calculated based on tax slabs
  const advanceDeduction = 0; // Can be set based on advances
  const totalDeduction = pfDeduction + esiDeduction + tdsDeduction + advanceDeduction;
  const netSalary = earnedGrossSalary - totalDeduction;

  // Create salary object with attendance-based calculations
  const s = {
    basic_salary: earnedBasic,
    hra_amount: earnedHRA,
    food_allowance: earnedFood,
    fixed_incentive: earnedIncentive,
    gross_salary: earnedGrossSalary,
    pf_deduction: pfDeduction,
    esi_deduction: esiDeduction,
    tds_deduction: tdsDeduction,
    advance_deduction: advanceDeduction,
    total_deduction: totalDeduction,
    net_salary: netSalary,
    total_days: totalDays,
    present_days: presentDays,
    earned_salary: netSalary
  };

  const earnings = [
    ['Basic Salary', s.basic_salary],
    ['House Rent Allowance (HRA)', s.hra_amount],
    ['Food Allowance', s.food_allowance],
    ['Fixed Incentive', s.fixed_incentive],
  ];
  const deductions = [
    ['Provident Fund (Employee)', s.pf_deduction],
    ['ESI', s.esi_deduction],
    ['Tax Deducted at Source (TDS)', s.tds_deduction],
    ['Advance Deduction', s.advance_deduction],
  ];

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
  <title>Salary Slip — ${employee.name} — ${monthName} ${year}</title>
  <style>
    ${getSharedStyles('#7b3f00', '#fdf0e6')}
    .payslip-table { width: 100%; border-collapse: collapse; margin: 2mm 0; font-size: 9pt; }
    .payslip-table th {
      background: #7b3f00;
      color: #fff;
      padding: 2.5mm 3mm;
      text-align: left;
      font-weight: 600;
      font-size: 8pt;
      letter-spacing: 0.5px;
    }
    .payslip-table td { padding: 2mm 3mm; border-bottom: 1px solid #f0e0d0; }
    .payslip-table tr:nth-child(even) td { background: #fdf5ef; }
    .payslip-table .total-row td {
      background: #fdf0e6;
      font-weight: 700;
      border-top: 2px solid #7b3f00;
      color: #7b3f00;
    }
    .pay-summary {
      display: flex;
      gap: 4mm;
      margin: 4mm 0;
    }
    .pay-card {
      flex: 1;
      padding: 3mm 4mm;
      border-radius: 4px;
      text-align: center;
    }
    .pay-card.gross { background: #eaf3ec; border: 1px solid #b5d8bb; }
    .pay-card.deduct { background: #fce8e8; border: 1px solid #f0b5b5; }
    .pay-card.net { background: #7b3f00; color: #fff; }
    .pay-card-label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; margin-bottom: 1mm; }
    .pay-card-amount { font-family: 'Playfair Display', serif; font-size: 14pt; font-weight: 700; }
    .pay-card.gross .pay-card-amount { color: #1e4d2b; }
    .pay-card.deduct .pay-card-amount { color: #a00; }
    .pay-card.net .pay-card-amount { color: #fff; }
    .in-words {
      background: #fdf0e6;
      border: 1px dashed #d4956a;
      border-radius: 4px;
      padding: 2.5mm 4mm;
      font-size: 9pt;
      margin: 2mm 0;
    }
  </style></head>
  <body><div class="page">
    ${letterHeader(company)}
    <div class="accent-bar" style="background: linear-gradient(90deg, #7b3f00 0%, #c17f3a 50%, #fdf0e6 100%);"></div>

    <div class="doc-title-block" style="background:#7b3f00;">
      <h1>Salary Slip</h1>
      <span class="doc-ref">Ref: ${refNo} &nbsp;|&nbsp; Month: ${monthName} ${year}</span>
    </div>

    <div class="meta-row">
      <div class="meta-item" style="border-left-color:#7b3f00;background:#fdf0e6;">
        <div class="meta-label">Employee Code</div><div class="meta-value" style="color:#7b3f00;">${employee.emp_code}</div>
      </div>
      <div class="meta-item" style="border-left-color:#7b3f00;background:#fdf0e6;">
        <div class="meta-label">Pay Period</div><div class="meta-value" style="color:#7b3f00;">${monthName} ${year}</div>
      </div>
      <div class="meta-item" style="border-left-color:#7b3f00;background:#fdf0e6;">
        <div class="meta-label">Department</div><div class="meta-value" style="color:#7b3f00;">${employee.department || 'General'}</div>
      </div>
    </div>

    <div class="addressee" style="border-color:#e8c9a8;background:#fdf5ef;">
      <div class="addressee-label">Employee Details</div>
      <div class="addressee-name" style="color:#7b3f00;">${employee.name}</div>
      <div class="addressee-details">
        Designation: ${employee.designation || 'Employee'} &nbsp;|&nbsp; Dept: ${employee.department || 'General'}<br>
        📧 ${employee.email} &nbsp;&nbsp; 📞 ${employee.phone}
        &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Bank A/C:</strong> XXXXXX1234 &nbsp;&nbsp; <strong>PAN:</strong> XXXXXXXXXX
      </div>
    </div>

    <div style="display:flex;gap:4mm;">
      <div style="flex:1;">
        <table class="payslip-table">
          <thead><tr><th>Earnings</th><th style="text-align:right;">Amount (₹)</th></tr></thead>
          <tbody>
            ${earnings.map(([label, val]) => `<tr><td>${label}</td><td style="text-align:right;">${fmt(val)}</td></tr>`).join('')}
            <tr class="total-row"><td>Gross Salary</td><td style="text-align:right;">${fmt(s?.gross_salary)}</td></tr>
          </tbody>
        </table>
      </div>
      <div style="flex:1;">
        <table class="payslip-table">
          <thead><tr><th>Deductions</th><th style="text-align:right;">Amount (₹)</th></tr></thead>
          <tbody>
            ${deductions.map(([label, val]) => `<tr><td>${label}</td><td style="text-align:right;">${fmt(val)}</td></tr>`).join('')}
            <tr class="total-row"><td>Total Deductions</td><td style="text-align:right;">${fmt(s?.total_deduction)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="info-box" style="background:#fdf0e6;border-color:#e8c9a8;margin-top:3mm;">
      <div class="info-box-title" style="color:#7b3f00;border-color:#e8c9a8;">📅 Attendance Summary</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-key">Total Working Days</span><span class="info-val">${s?.total_days || 0}</span></div>
        <div class="info-row"><span class="info-key">Days Present</span><span class="info-val">${s?.present_days || 0}</span></div>
        <div class="info-row"><span class="info-key">Days Absent</span><span class="info-val">${(s?.total_days || 0) - (s?.present_days || 0)}</span></div>
        <div class="info-row"><span class="info-key">Earned Salary</span><span class="info-val">₹ ${fmt(s?.earned_salary)}</span></div>
      </div>
    </div>

    <div class="pay-summary">
      <div class="pay-card gross">
        <div class="pay-card-label">Gross Earnings</div>
        <div class="pay-card-amount">₹ ${fmt(s?.gross_salary)}</div>
      </div>
      <div class="pay-card deduct">
        <div class="pay-card-label">Total Deductions</div>
        <div class="pay-card-amount">₹ ${fmt(s?.total_deduction)}</div>
      </div>
      <div class="pay-card net">
        <div class="pay-card-label">Net Take Home</div>
        <div class="pay-card-amount">₹ ${fmt(s?.net_salary)}</div>
      </div>
    </div>

    <div class="in-words">
      <strong>Amount in Words:</strong> ${numberToWords(Math.round(parseFloat(s?.net_salary || 0)))} Rupees Only
    </div>

    <div class="signature-section">
      <div class="sig-block">
        <div class="sig-line" style="border-color:#7b3f00;"></div>
        <div class="sig-name" style="color:#7b3f00;">${employee.name}</div>
        <div class="sig-title">Employee Signature</div>
      </div>
      <div class="company-seal" style="border-color:#7b3f00;color:#7b3f00;">GYANTI<br>SEAL</div>
      <div class="sig-block">
        <div class="sig-line" style="border-color:#7b3f00;"></div>
        <div class="sig-name" style="color:#7b3f00;">Finance Department</div>
        <div class="sig-title">Authorized Signatory</div>
      </div>
    </div>

    ${letterFooter(company)}
  </div></body></html>`;
}

// ─── Termination Letter ───────────────────────────────────────────────────────
function generateTerminationLetter(employee, company, date) {
  const refNo = `GYANTI/HR/TERM/${new Date().getFullYear()}/${String(employee.id).padStart(4, '0')}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
  <title>Termination Letter — ${employee.name}</title>
  <style>${getSharedStyles('#7a1010', '#fde8e8')}</style></head>
  <body><div class="page">
    ${letterHeader(company)}
    <div class="accent-bar" style="background: linear-gradient(90deg, #7a1010 0%, #c43b3b 50%, #fde8e8 100%);"></div>

    <div class="doc-title-block" style="background:#7a1010;">
      <h1>Termination Letter</h1>
      <span class="doc-ref">Ref: ${refNo} &nbsp;|&nbsp; Date: ${date}</span>
    </div>

    <div class="meta-row">
      <div class="meta-item" style="border-left-color:#7a1010;background:#fde8e8;">
        <div class="meta-label">Employee Code</div><div class="meta-value" style="color:#7a1010;">${employee.emp_code}</div>
      </div>
      <div class="meta-item" style="border-left-color:#7a1010;background:#fde8e8;">
        <div class="meta-label">Effective Date</div><div class="meta-value" style="color:#7a1010;">${date}</div>
      </div>
      <div class="meta-item" style="border-left-color:#7a1010;background:#fde8e8;">
        <div class="meta-label">Last Working Day</div><div class="meta-value" style="color:#7a1010;">${date}</div>
      </div>
    </div>

    <div class="addressee" style="border-color:#f0b5b5;background:#fdf5f5;">
      <div class="addressee-label">Addressed To</div>
      <div class="addressee-name" style="color:#7a1010;">${employee.name}</div>
      <div class="addressee-details">
        ${'Address not available'}<br>
        📧 ${employee.email} &nbsp;&nbsp; 📞 ${employee.phone}
      </div>
    </div>

    <p class="salutation">Dear ${employee.name},</p>

    <p class="body-text">
      This letter is to formally notify you that your employment with <strong>${company.fullName}</strong>
      is hereby terminated, effective <strong>${date}</strong>. This decision has been reached after careful
      consideration by the management.
    </p>

    <div class="info-box" style="background:#fde8e8;border-color:#f0b5b5;">
      <div class="info-box-title" style="color:#7a1010;border-color:#f0b5b5;">📋 Termination Details</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-key">Employee Name</span><span class="info-val">${employee.name}</span></div>
        <div class="info-row"><span class="info-key">Employee Code</span><span class="info-val">${employee.emp_code}</span></div>
        <div class="info-row"><span class="info-key">Designation</span><span class="info-val">${employee.designation || 'Employee'}</span></div>
        <div class="info-row"><span class="info-key">Department</span><span class="info-val">${employee.department || 'General'}</span></div>
        <div class="info-row"><span class="info-key">Termination Date</span><span class="info-val">${date}</span></div>
        <div class="info-row"><span class="info-key">Last Working Day</span><span class="info-val">${date}</span></div>
      </div>
    </div>

    <div class="info-box" style="background:#fde8e8;border-color:#f0b5b5;">
      <div class="info-box-title" style="color:#7a1010;border-color:#f0b5b5;">💼 Final Settlement & Handover</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-key">Final Salary</span><span class="info-val">Processed as per last working day</span></div>
        <div class="info-row"><span class="info-key">Pending Dues</span><span class="info-val">Settled within 30 days</span></div>
        <div class="info-row"><span class="info-key">Company Property</span><span class="info-val">Return by last working day</span></div>
        <div class="info-row"><span class="info-key">Experience Certificate</span><span class="info-val">Issued separately</span></div>
        <div class="info-row"><span class="info-key">Relieving Letter</span><span class="info-val">Issued post handover</span></div>
        <div class="info-row"><span class="info-key">Access Revocation</span><span class="info-val">Effective immediately</span></div>
      </div>
    </div>

    <p class="body-text">
      Please note that you are bound by all confidentiality obligations and non-disclosure agreements
      signed during your employment, even after separation from the Company.
    </p>
    <p class="body-text">
      We thank you for your services to <strong>${company.name}</strong> and wish you the very best
      in your future endeavors.
    </p>

    <div class="signature-section">
      <div class="sig-block">
        <div class="sig-line" style="border-color:#7a1010;"></div>
        <div class="sig-name" style="color:#7a1010;">${employee.name}</div>
        <div class="sig-title">Acknowledgment</div>
      </div>
      <div class="company-seal" style="border-color:#7a1010;color:#7a1010;">GYANTI<br>SEAL</div>
      <div class="sig-block">
        <div class="sig-line" style="border-color:#7a1010;"></div>
        <div class="sig-name" style="color:#7a1010;">HR Manager</div>
        <div class="sig-title">${company.fullName}</div>
      </div>
    </div>

    ${letterFooter(company)}
  </div></body></html>`;
}

// ─── Relieving Letter ─────────────────────────────────────────────────────────
function generateRelievingLetter(employee, company, date) {
  const annual = parseFloat(employee.salary || 0);
  const fmt = (n) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const refNo = `GYANTI/HR/REL/${new Date().getFullYear()}/${String(employee.id).padStart(4, '0')}`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
  <title>Relieving Letter — ${employee.name}</title>
  <style>${getSharedStyles('#1a3c5e', '#e8f0f7')}</style></head>
  <body><div class="page">
    ${letterHeader(company)}
    <div class="accent-bar"></div>

    <div class="doc-title-block">
      <h1>Relieving Letter</h1>
      <span class="doc-ref">Ref: ${refNo} &nbsp;|&nbsp; Date: ${date}</span>
    </div>

    <div style="text-align:center;margin:4mm 0;">
      <div style="font-size:8pt;letter-spacing:1.5px;color:#999;text-transform:uppercase;">To Whom It May Concern</div>
    </div>

    <p class="body-text">
      This is to certify that <strong>${employee.name}</strong> (Employee Code: <strong>${employee.emp_code}</strong>)
      was employed with <strong>${company.fullName}</strong> as <strong>${employee.designation || 'Employee'}</strong>
      in the <strong>${employee.department || 'General'}</strong> department.
      He/She has been relieved from duties effective <strong>${date}</strong>.
    </p>

    <div class="info-box">
      <div class="info-box-title">📋 Service Details</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-key">Employee Name</span><span class="info-val">${employee.name}</span></div>
        <div class="info-row"><span class="info-key">Employee Code</span><span class="info-val">${employee.emp_code}</span></div>
        <div class="info-row"><span class="info-key">Designation</span><span class="info-val">${employee.designation || 'Employee'}</span></div>
        <div class="info-row"><span class="info-key">Department</span><span class="info-val">${employee.department || 'General'}</span></div>
        <div class="info-row"><span class="info-key">Date of Joining</span><span class="info-val">${'On record'}</span></div>
        <div class="info-row"><span class="info-key">Date of Relieving</span><span class="info-val">${date}</span></div>
        <div class="info-row"><span class="info-key">Last Drawn CTC</span><span class="info-val">₹ ${fmt(annual)} per annum</span></div>
      </div>
    </div>

    <p class="body-text">
      During the tenure of employment, <strong>${employee.name}</strong> has been found sincere, hardworking,
      and dedicated. He/She has performed the assigned duties diligently and maintained a professional
      conduct throughout the period of service.
    </p>

    <div class="info-box">
      <div class="info-box-title">✅ Clearance Status</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-key">Company Assets</span><span class="info-val">Returned & Cleared</span></div>
        <div class="info-row"><span class="info-key">Knowledge Transfer</span><span class="info-val">Completed</span></div>
        <div class="info-row"><span class="info-key">Final Settlement</span><span class="info-val">Processed</span></div>
        <div class="info-row"><span class="info-key">System Access</span><span class="info-val">Revoked</span></div>
      </div>
    </div>

    <p class="body-text">
      We place on record our appreciation for the services rendered by <strong>${employee.name}</strong>
      during their tenure with us. We are confident that He/She will excel and bring the same level of
      dedication to future endeavors.
    </p>

    <p class="body-text">
      This letter is issued upon request of <strong>${employee.name}</strong> for use as a reference
      document. We wish him/her all the very best in their future career.
    </p>

    <div class="signature-section">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">${employee.name}</div>
        <div class="sig-title">Employee Acknowledgment</div>
      </div>
      <div class="company-seal">GYANTI<br>SEAL</div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">HR Manager</div>
        <div class="sig-title">${company.fullName}</div>
      </div>
    </div>

    ${letterFooter(company)}
  </div></body></html>`;
}

// ─── Number to Words (Indian system) ─────────────────────────────────────────
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
}