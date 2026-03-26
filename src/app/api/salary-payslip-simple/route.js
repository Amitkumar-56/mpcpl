// src/app/api/salary-payslip-simple/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const salaryId = searchParams.get('salary_id');

    if (!salaryId) {
      return NextResponse.json({
        success: false,
        error: 'Salary ID is required'
      }, { status: 400 });
    }

    console.log('Generating payslip for salary ID:', salaryId);

    // Check database connection first
    try {
      await executeQuery('SELECT 1');
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed: ' + dbError.message
      }, { status: 500 });
    }

    // Get salary details with employee info including account_details
    let salary;
    try {
      const query = `
        SELECT 
          sr.id,
          sr.employee_id,
          sr.month,
          sr.year,
          sr.total_days,
          sr.present_days,
          sr.basic_salary,
          sr.earned_salary,
          sr.pf_deduction,
          sr.esi_deduction,
          sr.tds_deduction,
          sr.advance_deduction,
          sr.total_deduction,
          sr.net_salary,
          sr.status,
          sr.release_date,
          sr.created_at,
          ep.name as employee_name,
          ep.emp_code,
          ep.phone,
          ep.email,
          ep.address,
          ep.account_details
        FROM salary_records sr
        LEFT JOIN employee_profile ep ON sr.employee_id = ep.id
        WHERE sr.id = ?
      `;
      
      console.log('Executing query with salaryId:', parseInt(salaryId));
      salary = await executeQuery(query, [parseInt(salaryId)]);
      
      console.log('Salary query result length:', salary?.length);
    } catch (queryError) {
      console.error('Error querying salary records:', queryError);
      return NextResponse.json({
        success: false,
        error: 'Error fetching salary details: ' + queryError.message
      }, { status: 500 });
    }

    if (!salary || salary.length === 0) {
      console.log('Salary record not found for ID:', salaryId);
      return NextResponse.json({
        success: false,
        error: `Salary record not found with ID: ${salaryId}`
      }, { status: 404 });
    }

    const salaryData = salary[0];
    console.log('Salary data found for employee:', salaryData.employee_name);
    
    // Parse account details from JSON
    let accountDetails = {};
    if (salaryData.account_details) {
      try {
        // Check if account_details is already an object or string
        accountDetails = typeof salaryData.account_details === 'string' 
          ? JSON.parse(salaryData.account_details) 
          : salaryData.account_details;
        console.log('Account details parsed:', accountDetails);
      } catch (e) {
        console.error('Error parsing account details:', e);
        // If parsing fails, try to use as is
        accountDetails = { raw: salaryData.account_details };
      }
    }

    // Generate payslip content
    const payslipContent = generatePayslipContent(salaryData, accountDetails);

    // Create filename with safe characters
    const safeName = (salaryData.employee_name || 'employee').replace(/[^a-z0-9]/gi, '_');
    const filename = `salary_slip_${safeName}_${salaryData.month}_${salaryData.year}.txt`;

    console.log('Payslip generated successfully, filename:', filename);

    // Return as JSON with payslip data
    return NextResponse.json({
      success: true,
      message: 'Salary payslip generated successfully',
      payslip: payslipContent,
      filename: filename
    });

  } catch (error) {
    console.error('Error generating salary payslip:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

function generatePayslipContent(salaryData, accountDetails) {
  const monthName = getMonthName(salaryData.month);
  
  // Format bank details if available
  let bankDetailsSection = '';
  if (accountDetails && Object.keys(accountDetails).length > 0) {
    const lines = [];
    
    // Common field names that might be in account_details
    const fields = {
      account_holder_name: ['account_holder_name', 'holder_name', 'name', 'account_name'],
      bank_name: ['bank_name', 'bank', 'bankName'],
      bank_account: ['bank_account', 'account_number', 'account_no', 'accountNumber', 'acc_no'],
      ifsc_code: ['ifsc_code', 'ifsc', 'code', 'ifscCode'],
      branch: ['branch', 'branch_name', 'branchName'],
      upi_id: ['upi_id', 'upi', 'upiId']
    };
    
    // Extract values using possible field names
    const extracted = {};
    for (const [key, possibleNames] of Object.entries(fields)) {
      for (const name of possibleNames) {
        if (accountDetails[name]) {
          extracted[key] = accountDetails[name];
          break;
        }
      }
    }
    
    if (extracted.account_holder_name) {
      lines.push(`Account Holder: ${extracted.account_holder_name}`);
    }
    if (extracted.bank_name) {
      lines.push(`Bank Name: ${extracted.bank_name}`);
    }
    if (extracted.bank_account) {
      // Mask account number for security (show last 4 digits)
      const accNum = extracted.bank_account.toString();
      const maskedAcc = accNum.length > 4 ? 'XXXX' + accNum.slice(-4) : accNum;
      lines.push(`Account Number: ${maskedAcc}`);
    }
    if (extracted.ifsc_code) {
      lines.push(`IFSC Code: ${extracted.ifsc_code}`);
    }
    if (extracted.branch) {
      lines.push(`Branch: ${extracted.branch}`);
    }
    if (extracted.upi_id) {
      lines.push(`UPI ID: ${extracted.upi_id}`);
    }
    
    if (lines.length > 0) {
      bankDetailsSection = `
Bank Details:
------------
${lines.join('\n')}
      `.trim();
    } else {
      // If no standard fields found, show raw data
      bankDetailsSection = `
Bank Details:
------------
${JSON.stringify(accountDetails, null, 2)}
      `.trim();
    }
  }
  
  return `
===========================================
              SALARY PAYMENT SLIP
===========================================

Employee Details:
----------------
Name: ${salaryData.employee_name || 'N/A'}
Employee Code: ${salaryData.emp_code || 'N/A'}
Phone: ${salaryData.phone || 'N/A'}
Email: ${salaryData.email || 'N/A'}
${salaryData.address ? `Address: ${salaryData.address}` : ''}

Payment Details:
----------------
Month: ${monthName} ${salaryData.year || 'N/A'}
Total Days: ${salaryData.total_days || 'N/A'}
Present Days: ${parseFloat(salaryData.present_days || 0).toFixed(1)}
Release Date: ${salaryData.release_date ? new Date(salaryData.release_date).toLocaleDateString('en-IN') : 'Not Released'}
Status: ${salaryData.status ? salaryData.status.toUpperCase() : 'PENDING'}

Salary Breakdown:
----------------
Basic Salary: ₹${parseFloat(salaryData.basic_salary || 0).toFixed(2)}
Earned Salary: ₹${parseFloat(salaryData.earned_salary || 0).toFixed(2)}

Deductions:
------------
${salaryData.pf_deduction > 0 ? `PF Deduction (12%): ₹${parseFloat(salaryData.pf_deduction).toFixed(2)}` : 'PF Deduction: ₹0.00'}
${salaryData.esi_deduction > 0 ? `ESI Deduction (0.75%): ₹${parseFloat(salaryData.esi_deduction).toFixed(2)}` : 'ESI Deduction: ₹0.00'}
${salaryData.tds_deduction > 0 ? `TDS Deduction: ₹${parseFloat(salaryData.tds_deduction).toFixed(2)}` : 'TDS Deduction: ₹0.00'}
${salaryData.advance_deduction > 0 ? `Advance Deduction: ₹${parseFloat(salaryData.advance_deduction).toFixed(2)}` : 'Advance Deduction: ₹0.00'}
${'-'.repeat(40)}
Total Deductions: ₹${parseFloat(salaryData.total_deduction || 0).toFixed(2)}

Net Salary: ₹${parseFloat(salaryData.net_salary || 0).toFixed(2)}
${'='.repeat(40)}

${bankDetailsSection ? bankDetailsSection + '\n' : ''}
${salaryData.status === 'released' ? 'Payment Status: RELEASED ✓' : 'Payment Status: PENDING'}

Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

This is a computer generated document and does not require signature.
===========================================
  `.trim();
}

function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[parseInt(month) - 1] || month;
}