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

    // Get current user
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const currentUserId = decoded.userId || decoded.id;

    // Get current user's role
    const userInfo = await executeQuery(
      `SELECT role FROM employee_profile WHERE id = ?`,
      [currentUserId]
    );

    if (!userInfo || userInfo.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userRole = parseInt(userInfo[0].role) || 0;

    // Only Admin, Accountant, and Team Leader can generate letters
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

    // Get employee details
    const employee = await executeQuery(
      `SELECT id, name, emp_code, email, phone, address, salary
       FROM employee_profile WHERE id = ?`,
      [employeeId]
    );

    if (!employee || employee.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const employeeData = employee[0];

    // Get company details (you can modify this to get from settings table)
    const companyDetails = {
      name: 'MPCPL - Multi Petroleum Company Private Limited',
      address: '123, Corporate Park, Main Road, City - 400001',
      phone: '+91-22-12345678',
      email: 'info@mpcpl.com',
      website: 'www.mpcpl.com',
      logo: 'https://via.placeholder.com/150x50.png?text=MPCPL'
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
        letterContent = await generateSalarySlip(employeeData, companyDetails, currentDate, month, year);
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
        return NextResponse.json(
          { success: false, error: 'Invalid letter type' },
          { status: 400 }
        );
    }

    // Generate PDF (simplified HTML to PDF conversion)
    // In production, you would use a proper PDF library like puppeteer or jsPDF
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
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Letter Generation Functions
function generateOfferLetter(employee, company, date) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Offer Letter</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .address { font-size: 12px; color: #7f8c8d; }
        .content { margin: 20px 0; }
        .signature { margin-top: 50px; }
        .footer { margin-top: 30px; font-size: 11px; color: #95a5a6; }
        h2 { color: #2c3e50; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">${company.name}</div>
        <div class="address">${company.address}<br>
        Phone: ${company.phone} | Email: ${company.email}<br>
        Website: ${company.website}</div>
    </div>

    <div class="content">
        <h2>OFFER OF EMPLOYMENT</h2>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>To:</strong><br>
        ${employee.name}<br>
        ${employee.address || 'Address not available'}<br>
        ${employee.email}<br>
        ${employee.phone}</p>

        <p>Dear ${employee.name},</p>

        <p>We are pleased to offer you position of <strong>Employee</strong> at ${company.name}. This offer is subject to the terms and conditions outlined below:</p>

        <div class="details">
            <p><strong>Employment Details:</strong></p>
            <ul>
                <li><strong>Position:</strong> Employee</li>
                <li><strong>Department:</strong> General</li>
                <li><strong>Employee Code:</strong> ${employee.emp_code}</li>
                <li><strong>Start Date:</strong> ${date}</li>
                <li><strong>Location:</strong> ${company.address}</li>
            </ul>
        </div>

        <div class="details">
            <p><strong>Compensation & Benefits:</strong></p>
            <ul>
                <li><strong>Annual CTC:</strong> ₹${parseFloat(employee.salary || 0).toLocaleString('en-IN')}</li>
                <li><strong>Basic Salary:</strong> ₹${(parseFloat(employee.salary || 0) * 0.5).toLocaleString('en-IN')}</li>
                <li><strong>HRA:</strong> ₹${(parseFloat(employee.salary || 0) * 0.15).toLocaleString('en-IN')}</li>
                <li><strong>Other Allowances:</strong> ₹${(parseFloat(employee.salary || 0) * 0.35).toLocaleString('en-IN')}</li>
                <li><strong>Provident Fund:</strong> As per company policy</li>
                <li><strong>ESI:</strong> As per applicable norms</li>
            </ul>
        </div>

        <p>This offer is contingent upon your acceptance of the terms and conditions, successful completion of any background checks, and provision of genuine documents.</p>

        <p>Please confirm your acceptance of this offer by signing and returning a copy of this letter within 7 days from the date of this letter.</p>

        <p>We look forward to welcoming you to our team.</p>

        <p>Sincerely,</p>
    </div>

    <div class="signature">
        <p>_________________________<br>
        <strong>HR Manager</strong><br>
        ${company.name}</p>
    </div>

    <div class="footer">
        <p>This is a computer-generated document. No signature required.</p>
    </div>
</body>
</html>`;
}

function generateAppointmentLetter(employee, company, date) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Appointment Letter</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .address { font-size: 12px; color: #7f8c8d; }
        .content { margin: 20px 0; }
        .signature { margin-top: 50px; }
        .footer { margin-top: 30px; font-size: 11px; color: #95a5a6; }
        h2 { color: #2c3e50; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">${company.name}</div>
        <div class="address">${company.address}<br>
        Phone: ${company.phone} | Email: ${company.email}<br>
        Website: ${company.website}</div>
    </div>

    <div class="content">
        <h2>APPOINTMENT LETTER</h2>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>To:</strong><br>
        ${employee.name}<br>
        ${employee.address || 'Address not available'}<br>
        ${employee.email}<br>
        ${employee.phone}</p>

        <p>Dear ${employee.name},</p>

        <p>We are delighted to confirm your appointment as <strong>${employee.designation || 'Employee'}</strong> at ${company.name}, effective from <strong>${date}</strong>.</p>

        <div class="details">
            <p><strong>Appointment Terms:</strong></p>
            <ul>
                <li><strong>Employee Code:</strong> ${employee.emp_code}</li>
                <li><strong>Position:</strong> Employee</li>
                <li><strong>Department:</strong> General</li>
                <li><strong>Employment Type:</strong> Permanent</li>
                <li><strong>Probation Period:</strong> 6 months</li>
                <li><strong>Working Hours:</strong> 9:30 AM to 6:30 PM (Monday to Saturday)</li>
                <li><strong>Reporting to:</strong> Department Head</li>
            </ul>
        </div>

        <div class="details">
            <p><strong>Salary Structure:</strong></p>
            <ul>
                <li><strong>Annual CTC:</strong> ₹${parseFloat(employee.salary || 0).toLocaleString('en-IN')}</li>
                <li><strong>Monthly Gross:</strong> ₹${(parseFloat(employee.salary || 0) / 12).toLocaleString('en-IN')}</li>
                <li><strong>Basic Salary:</strong> ₹${((parseFloat(employee.salary || 0) / 12) * 0.5).toLocaleString('en-IN')}</li>
                <li><strong>HRA:</strong> ₹${((parseFloat(employee.salary || 0) / 12) * 0.15).toLocaleString('en-IN')}</li>
                <li><strong>Other Allowances:</strong> ₹${((parseFloat(employee.salary || 0) / 12) * 0.35).toLocaleString('en-IN')}</li>
            </ul>
        </div>

        <p>During the probation period, your performance will be reviewed regularly. Upon successful completion of probation, your appointment will be confirmed with any applicable revisions.</p>

        <p>Welcome to ${company.name}. We wish you a successful and rewarding career with us.</p>

        <p>Sincerely,</p>
    </div>

    <div class="signature">
        <p>_________________________<br>
        <strong>HR Manager</strong><br>
        ${company.name}</p>
    </div>

    <div class="footer">
        <p>This is a computer-generated document. No signature required.</p>
    </div>
</body>
</html>`;
}

function generateJoiningLetter(employee, company, date) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Joining Letter</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .address { font-size: 12px; color: #7f8c8d; }
        .content { margin: 20px 0; }
        .signature { margin-top: 50px; }
        .footer { margin-top: 30px; font-size: 11px; color: #95a5a6; }
        h2 { color: #2c3e50; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">${company.name}</div>
        <div class="address">${company.address}<br>
        Phone: ${company.phone} | Email: ${company.email}<br>
        Website: ${company.website}</div>
    </div>

    <div class="content">
        <h2>JOINING LETTER</h2>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>To:</strong><br>
        ${employee.name}<br>
        Employee Code: ${employee.emp_code}<br>
        ${employee.designation || 'Employee'}</p>

        <p>Dear ${employee.name},</p>

        <p>We are pleased to welcome you to the ${company.name} team! Your joining formalities have been completed, and you are now officially part of our organization as <strong>${employee.designation || 'Employee'}</strong>.</p>

        <div class="details">
            <p><strong>Joining Details:</strong></p>
            <ul>
                <li><strong>Date of Joining:</strong> ${date}</li>
                <li><strong>Employee Code:</strong> ${employee.emp_code}</li>
                <li><strong>Position:</strong> Employee</li>
                <li><strong>Department:</strong> General</li>
                <li><strong>Email:</strong> ${employee.email}</li>
                <li><strong>Phone:</strong> ${employee.phone}</li>
            </ul>
        </div>

        <div class="details">
            <p><strong>Important Information:</strong></p>
            <ul>
                <li>Your probation period is 6 months from the date of joining</li>
                <li>Working hours: 9:30 AM to 6:30 PM (Monday to Saturday)</li>
                <li>Please complete all documentation within the first week</li>
                <li>You will be assigned a mentor for your initial training period</li>
                <li>Company policies and handbook will be provided separately</li>
            </ul>
        </div>

        <p>We are excited to have you with us and look forward to your contributions to our organization's growth and success.</p>

        <p>Should you have any questions or need assistance during your initial period, please feel free to contact the HR department.</p>

        <p>Once again, welcome aboard!</p>

        <p>Sincerely,</p>
    </div>

    <div class="signature">
        <p>_________________________<br>
        <strong>HR Manager</strong><br>
        ${company.name}</p>
    </div>

    <div class="footer">
        <p>This is a computer-generated document. No signature required.</p>
    </div>
</body>
</html>`;
}

function generateAgreementLetter(employee, company, date) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Employment Agreement</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .address { font-size: 12px; color: #7f8c8d; }
        .content { margin: 20px 0; }
        .signature { margin-top: 50px; }
        .footer { margin-top: 30px; font-size: 11px; color: #95a5a6; }
        h2 { color: #2c3e50; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .terms { margin: 20px 0; }
        .terms ol { padding-left: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">${company.name}</div>
        <div class="address">${company.address}<br>
        Phone: ${company.phone} | Email: ${company.email}<br>
        Website: ${company.website}</div>
    </div>

    <div class="content">
        <h2>EMPLOYMENT AGREEMENT</h2>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Between:</strong></p>
        <p><strong>${company.name}</strong> (hereinafter referred to as "Company")<br>
        And<br>
        <strong>${employee.name}</strong> (hereinafter referred to as "Employee")</p>

        <p>This Employment Agreement is entered into on this ${date} between ${company.name} and ${employee.name}.</p>

        <div class="details">
            <p><strong>Particulars of Employee:</strong></p>
            <ul>
                <li><strong>Name:</strong> ${employee.name}</li>
                <li><strong>Employee Code:</strong> ${employee.emp_code}</li>
                <li><strong>Position:</strong> Employee</li>
                <li><strong>Department:</strong> General</li>
                <li><strong>Date of Joining:</strong> ${date}</li>
            </ul>
        </div>

        <div class="terms">
            <h3>Terms and Conditions:</h3>
            <ol>
                <li><strong>Employment Period:</strong> This agreement is effective from the date of joining and continues until terminated by either party as per the terms herein.</li>
                
                <li><strong>Probation Period:</strong> The employee shall undergo a probation period of 6 months from the date of joining.</li>
                
                <li><strong>Job Responsibilities:</strong> The employee shall perform duties assigned by the company related to the position of ${employee.designation || 'Employee'}.</li>
                
                <li><strong>Working Hours:</strong> Standard working hours are 9:30 AM to 6:30 PM, Monday to Saturday.</li>
                
                <li><strong>Compensation:</strong> The employee shall receive an annual CTC of ₹${parseFloat(employee.salary || 0).toLocaleString('en-IN')} payable monthly.</li>
                
                <li><strong>Confidentiality:</strong> The employee shall maintain confidentiality of all company information and trade secrets.</li>
                
                <li><strong>Termination:</strong> Either party may terminate this agreement with 30 days notice period.</li>
                
                <li><strong>Governing Law:</strong> This agreement shall be governed by the laws of India.</li>
            </ol>
        </div>

        <p>Both parties hereby agree to the terms and conditions outlined in this agreement.</p>

        <div class="signature">
            <table width="100%">
                <tr>
                    <td width="50%">
                        <p>_________________________<br>
                        <strong>For ${company.name}</strong><br>
                        Authorized Signatory</p>
                    </td>
                    <td width="50%">
                        <p>_________________________<br>
                        <strong>${employee.name}</strong><br>
                        Employee</p>
                    </td>
                </tr>
            </table>
        </div>
    </div>

    <div class="footer">
        <p>This is a computer-generated document. Both parties should sign and retain a copy.</p>
    </div>
</body>
</html>`;
}

async function generateSalarySlip(employee, company, date, month, year) {
  // Get salary details for the month
  const salary = await executeQuery(
    `SELECT * FROM salary_records 
     WHERE employee_id = ? AND month = ? AND year = ?`,
    [employee.id, month, year]
  );

  const salaryData = salary && salary.length > 0 ? salary[0] : null;
  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' });

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Salary Slip</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .address { font-size: 12px; color: #7f8c8d; }
        .content { margin: 20px 0; }
        .salary-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .salary-table th, .salary-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .salary-table th { background-color: #f2f2f2; }
        .footer { margin-top: 30px; font-size: 11px; color: #95a5a6; }
        h2 { color: #2c3e50; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .total-row { font-weight: bold; background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">${company.name}</div>
        <div class="address">${company.address}<br>
        Phone: ${company.phone} | Email: ${company.email}</div>
    </div>

    <div class="content">
        <h2>SALARY SLIP</h2>
        <p><strong>Month:</strong> ${monthName} ${year}</p>
        
        <div class="details">
            <table width="100%">
                <tr>
                    <td width="50%">
                        <p><strong>Employee Details:</strong></p>
                        <p>Name: ${employee.name}<br>
                        Employee Code: ${employee.emp_code}<br>
                        Designation: ${employee.designation || 'Employee'}<br>
                        Department: ${employee.department || 'General'}</p>
                    </td>
                    <td width="50%">
                        <p><strong>Payment Details:</strong></p>
                        <p>Bank Account: XXXXXX1234<br>
                        PAN: XXXXXXXXXX<br>
                        Net Salary: ₹${salaryData ? parseFloat(salaryData.net_salary).toLocaleString('en-IN') : '0.00'}</p>
                    </td>
                </tr>
            </table>
        </div>

        <h3>Earnings</h3>
        <table class="salary-table">
            <tr>
                <th>Component</th>
                <th>Amount (₹)</th>
            </tr>
            <tr>
                <td>Basic Salary</td>
                <td>${salaryData ? parseFloat(salaryData.basic_salary || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</td>
            </tr>
            <tr>
                <td>HRA</td>
                <td>${salaryData ? parseFloat(salaryData.hra_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</td>
            </tr>
            <tr>
                <td>Food Allowance</td>
                <td>${salaryData ? parseFloat(salaryData.food_allowance || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</td>
            </tr>
            <tr>
                <td>Fixed Incentive</td>
                <td>${salaryData ? parseFloat(salaryData.fixed_incentive || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</td>
            </tr>
            <tr class="total-row">
                <td><strong>Gross Salary</strong></td>
                <td><strong>${salaryData ? parseFloat(salaryData.gross_salary || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</strong></td>
            </tr>
        </table>

        <h3>Deductions</h3>
        <table class="salary-table">
            <tr>
                <th>Component</th>
                <th>Amount (₹)</th>
            </tr>
            <tr>
                <td>Provident Fund (Employee)</td>
                <td>${salaryData ? parseFloat(salaryData.pf_deduction || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</td>
            </tr>
            <tr>
                <td>ESI</td>
                <td>${salaryData ? parseFloat(salaryData.esi_deduction || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</td>
            </tr>
            <tr>
                <td>TDS</td>
                <td>${salaryData ? parseFloat(salaryData.tds_deduction || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</td>
            </tr>
            <tr>
                <td>Advance Deduction</td>
                <td>${salaryData ? parseFloat(salaryData.advance_deduction || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</td>
            </tr>
            <tr class="total-row">
                <td><strong>Total Deductions</strong></td>
                <td><strong>${salaryData ? parseFloat(salaryData.total_deduction || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</strong></td>
            </tr>
        </table>

        <div class="details">
            <table width="100%">
                <tr>
                    <td width="50%">
                        <p><strong>Attendance Details:</strong></p>
                        <p>Total Days: ${salaryData ? salaryData.total_days || 0 : 0}<br>
                        Present Days: ${salaryData ? salaryData.present_days || 0 : 0}<br>
                        Earned Salary: ₹${salaryData ? parseFloat(salaryData.earned_salary || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</p>
                    </td>
                    <td width="50%">
                        <p><strong>Net Salary:</strong></p>
                        <p style="font-size: 18px; font-weight: bold; color: #2c3e50;">
                            ₹${salaryData ? parseFloat(salaryData.net_salary || 0).toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}
                        </p>
                        <p><strong>In Words:</strong> ${salaryData ? numberToWords(parseFloat(salaryData.net_salary || 0)) : 'Zero'} Rupees Only</p>
                    </td>
                </tr>
            </table>
        </div>

        <div class="signature">
            <table width="100%">
                <tr>
                    <td width="50%">
                        <p>_________________________<br>
                        <strong>Employee Signature</strong><br>
                        ${employee.name}</p>
                    </td>
                    <td width="50%">
                        <p>_________________________<br>
                        <strong>Authorized Signatory</strong><br>
                        Finance Department</p>
                    </td>
                </tr>
            </table>
        </div>
    </div>

    <div class="footer">
        <p>This is a computer-generated salary slip. For any queries, contact HR department.</p>
    </div>
</body>
</html>`;
}

function generateTerminationLetter(employee, company, date) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Termination Letter</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .address { font-size: 12px; color: #7f8c8d; }
        .content { margin: 20px 0; }
        .signature { margin-top: 50px; }
        .footer { margin-top: 30px; font-size: 11px; color: #95a5a6; }
        h2 { color: #2c3e50; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">${company.name}</div>
        <div class="address">${company.address}<br>
        Phone: ${company.phone} | Email: ${company.email}<br>
        Website: ${company.website}</div>
    </div>

    <div class="content">
        <h2>TERMINATION LETTER</h2>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>To:</strong><br>
        ${employee.name}<br>
        Employee Code: ${employee.emp_code}<br>
        ${employee.designation || 'Employee'}<br>
        ${employee.address || 'Address not available'}</p>

        <p>Dear ${employee.name},</p>

        <p>This letter is to inform you that your employment with ${company.name} has been terminated, effective from <strong>${date}</strong>.</p>

        <div class="details">
            <p><strong>Termination Details:</strong></p>
            <ul>
                <li><strong>Employee Name:</strong> ${employee.name}</li>
                <li><strong>Employee Code:</strong> ${employee.emp_code}</li>
                <li><strong>Position:</strong> Employee</li>
                <li><strong>Department:</strong> General</li>
                <li><strong>Date of Joining:</strong> Not available</li>
                <li><strong>Last Working Day:</strong> ${date}</li>
            </ul>
        </div>

        <div class="details">
            <p><strong>Reason for Termination:</strong></p>
            <p>[Please specify the reason for termination - e.g., Performance issues, Violation of company policy, Redundancy, etc.]</p>
        </div>

        <div class="details">
            <p><strong>Final Settlement:</strong></p>
            <ul>
                <li>Your final salary will be processed as per your last working day</li>
                <li>Any pending dues will be settled within 30 days</li>
                <li>Please return all company property by your last working day</li>
                <li>Your experience certificate and relieving letter will be provided separately</li>
            </ul>
        </div>

        <p>We thank you for your services to ${company.name} and wish you the best in your future endeavors.</p>

        <p>Please contact the HR department for any clarification regarding the termination process and final settlement.</p>

        <p>Sincerely,</p>
    </div>

    <div class="signature">
        <p>_________________________<br>
        <strong>HR Manager</strong><br>
        ${company.name}</p>
    </div>

    <div class="footer">
        <p>This is a computer-generated document. No signature required.</p>
    </div>
</body>
</html>`;
}

function generateRelievingLetter(employee, company, date) {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Relieving Letter</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .address { font-size: 12px; color: #7f8c8d; }
        .content { margin: 20px 0; }
        .signature { margin-top: 50px; }
        .footer { margin-top: 30px; font-size: 11px; color: #95a5a6; }
        h2 { color: #2c3e50; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">${company.name}</div>
        <div class="address">${company.address}<br>
        Phone: ${company.phone} | Email: ${company.email}<br>
        Website: ${company.website}</div>
    </div>

    <div class="content">
        <h2>RELIEVING LETTER</h2>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>To Whom It May Concern:</strong></p>

        <p>This is to certify that <strong>${employee.name}</strong> was employed with ${company.name} from <strong>Not available</strong> to <strong>${date}</strong>.</p>

        <div class="details">
            <p><strong>Employment Details:</strong></p>
            <ul>
                <li><strong>Employee Name:</strong> ${employee.name}</li>
                <li><strong>Employee Code:</strong> ${employee.emp_code}</li>
                <li><strong>Position:</strong> Employee</li>
                <li><strong>Department:</strong> General</li>
                <li><strong>Date of Joining:</strong> Not available</li>
                <li><strong>Date of Relieving:</strong> ${date}</li>
                <li><strong>Last Drawn Salary:</strong> ₹${parseFloat(employee.salary || 0).toLocaleString('en-IN')} per annum</li>
            </ul>
        </div>

        <p>During the period of employment, ${employee.name} was found to be sincere, dedicated, and performed the assigned duties to the best of their abilities.</p>

        <div class="details">
            <p><strong>Responsibilities Handled:</strong></p>
            <ul>
                <li>[List key responsibilities and achievements]</li>
                <li>[Mention any special projects or contributions]</li>
                <li>[Highlight any notable performance]</li>
            </ul>
        </div>

        <p>We wish to place on record our appreciation for the services rendered by ${employee.name} during their tenure with us.</p>

        <p>We wish ${employee.name} all the very best for their future endeavors and are confident that they will excel in their chosen career path.</p>

        <p>This letter is issued based on the request from ${employee.name} for their future references.</p>

        <p>Sincerely,</p>
    </div>

    <div class="signature">
        <p>_________________________<br>
        <strong>HR Manager</strong><br>
        ${company.name}</p>
    </div>

    <div class="footer">
        <p>This is a computer-generated document. For verification, please contact HR department.</p>
    </div>
</body>
</html>`;
}

// Helper function to convert number to words (simplified version)
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + numberToWords(num % 100) : '');
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + numberToWords(num % 100000) : '');
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + numberToWords(num % 10000000) : '');
}
