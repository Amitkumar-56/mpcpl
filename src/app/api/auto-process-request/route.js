import { getCurrentUser } from '@/lib/auth';
import { executeQuery } from "@/lib/db";
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('🚀 /auto-process-request API called');
    
    const body = await request.json();
    const { requestId } = body;
    
    if (!requestId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Request ID is required' 
      }, { status: 400 });
    }
    
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const userId = currentUser.userId;
    const now = new Date();
    const istTime = now.toISOString().slice(0, 19).replace('T', ' ');
    
    // ✅ Step 1: Get request details and check eligibility
    const requestQuery = `
      SELECT fr.*, cb.amtlimit, cb.day_limit, c.client_type
      FROM filling_requests fr
      LEFT JOIN customer_balances cb ON fr.cid = cb.com_id
      LEFT JOIN customers c ON fr.cid = c.id
      WHERE fr.id = ?
    `;
    
    const requestData = await executeQuery(requestQuery, [requestId]);
    
    if (requestData.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Request not found' 
      }, { status: 404 });
    }
    
    const req = requestData[0];
    
    // ✅ Step 2: Check if request is Pending
    if (req.status !== 'Pending') {
      return NextResponse.json({ 
        success: false, 
        error: `Request is already ${req.status}` 
      }, { status: 400 });
    }
    
    // ✅ Step 3: Check eligibility (same logic as GET API)
    const qty = parseFloat(req.qty) || 0;
    const balance = parseFloat(req.amtlimit) || 0;
    const dayLimit = parseInt(req.day_limit) || 0;
    const isDayLimitCustomer = dayLimit > 0;
    
    let eligibility = 'Yes';
    let eligibility_reason = '';
    
    // Day limit customers should NOT show "Insufficient Balance" error
    // Only check balance for credit_limit customers (amtlimit customers)
    if (!isDayLimitCustomer && (balance === 0 || balance < qty * 100)) {
      eligibility = 'No';
      eligibility_reason = 'Insufficient Balance';
    }
    
    if (eligibility === 'No') {
      return NextResponse.json({ 
        success: false, 
        error: `Not eligible: ${eligibility_reason}`,
        eligibility: 'No',
        eligibility_reason: eligibility_reason
      }, { status: 403 });
    }
    
    // ✅ Step 4: Update status to Processing
    const updateQuery = `
      UPDATE filling_requests 
      SET status = 'Processing', 
          pdate = ?,
          pcid = ?,
          status_updated_by = ?
      WHERE id = ?
    `;
    
    const updateResult = await executeQuery(updateQuery, [istTime, userId, userId, requestId]);
    
    if (updateResult.affectedRows === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update request status' 
      }, { status: 500 });
    }
    
    // ✅ Step 5: Update filling_logs
    const checkLogQuery = `SELECT id FROM filling_logs WHERE request_id = ?`;
    const existingLogs = await executeQuery(checkLogQuery, [req.rid]);
    
    if (existingLogs.length > 0) {
      // Update existing log
      await executeQuery(
        `UPDATE filling_logs SET processed_by = ?, processed_date = ? WHERE request_id = ?`,
        [userId, istTime, req.rid]
      );
      console.log('✅ Updated existing filling log');
    } else {
      // Create new log
      await executeQuery(
        `INSERT INTO filling_logs (request_id, created_by, created_date, processed_by, processed_date) 
         VALUES (?, ?, ?, ?, ?)`,
        [req.rid, req.cid, req.created, userId, istTime]
      );
      console.log('✅ Created new filling log');
    }
    
    // ✅ Step 6: Create edit log
    try {
      await executeQuery(
        `INSERT INTO edit_logs 
         (request_id, edited_by, edited_date, old_status, new_status, changes) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.rid,
          userId,
          istTime,
          'Pending',
          'Processing',
          JSON.stringify({
            status: { from: 'Pending', to: 'Processing' },
            auto_processed: true,
            processed_by_id: userId,
            processed_date: istTime,
            eligibility_checked: true,
            eligibility: 'Yes'
          })
        ]
      );
      console.log('✅ Created edit log');
    } catch (editLogError) {
      console.log('⚠️ Edit log creation failed (non-critical):', editLogError.message);
    }
    
    // ✅ Step 7: Audit log
    try {
      const { createAuditLog } = await import('@/lib/auditLog');
      
      // Get user name for audit log
      const userResult = await executeQuery(
        'SELECT name FROM employee_profile WHERE id = ?',
        [userId]
      );
      const userName = userResult.length > 0 ? userResult[0].name : 'System';
      
      await createAuditLog({
        page: 'Filling Requests',
        uniqueCode: `AUTO-PROCESS-${req.rid}`,
        section: 'Auto Process Request',
        userId: userId,
        userName: userName,
        action: 'update',
        remarks: `Request auto-processed on view. Status: Pending → Processing`,
        oldValue: { status: 'Pending', id: req.id, rid: req.rid },
        newValue: { status: 'Processing', processed_by: userId, processed_date: istTime },
        recordType: 'filling_request',
        recordId: parseInt(requestId)
      });
      console.log('✅ Created audit log');
    } catch (auditError) {
      console.log('⚠️ Audit log creation failed:', auditError.message);
    }
    
    console.log('✅ Request auto-processed successfully:', req.rid);
    
    return NextResponse.json({ 
      success: true, 
      message: `Request ${req.rid} moved to Processing`,
      data: {
        rid: req.rid,
        newStatus: 'Processing',
        processedBy: userId,
        processedDate: istTime,
        eligibility: 'Yes'
      }
    });
    
  } catch (error) {
    console.error('❌ Auto-process error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Server error: ' + error.message 
    }, { status: 500 });
  }
}