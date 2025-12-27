import { createAuditLog } from '@/lib/auditLog';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from "@/lib/db";
import fs from 'fs';
import { cookies } from 'next/headers';
import { NextResponse } from "next/server";
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    console.log('🔍 Fetching request with ID:', id);
    
    const query = `
      SELECT 
        fr.*, 
        c.name as customer_name, 
        c.phone as customer_phone,
        fs.station_name as loading_station,
        p.pname as product_name,
        pc.pcode as product_code,
        ep.name as updated_by_name,
        cb.amtlimit as customer_balance
      FROM filling_requests fr
      LEFT JOIN customers c ON c.id = fr.cid
      LEFT JOIN filling_stations fs ON fs.id = fr.fs_id
      LEFT JOIN products p ON p.id = fr.product
      LEFT JOIN product_codes pc ON pc.id = fr.fl_id
      LEFT JOIN employee_profile ep ON ep.id = fr.status_updated_by
      LEFT JOIN customer_balances cb ON cb.com_id = fr.cid
      WHERE fr.id = ?
    `;

    const requestData = await executeQuery(query, [id]);
    
    console.log('📦 Database result:', requestData);
    
    if (requestData.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({ request: requestData[0] });
  } catch (error) {
    console.error('❌ Database error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { status, qty, aqty, vehicle_number, driver_number, remark } = body;

    console.log('💾 Updating request:', { id, ...body });

    // Check if request exists
    const checkQuery = "SELECT * FROM filling_requests WHERE id = ?";
    const existingRequest = await executeQuery(checkQuery, [id]);
    
    if (existingRequest.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const oldRequest = existingRequest[0];
    const oldQty = parseFloat(oldRequest.aqty ?? oldRequest.qty ?? 0) || 0;
    const newQty = aqty !== undefined
      ? parseFloat(aqty) || 0
      : (qty !== undefined ? parseFloat(qty) || 0 : oldQty);
    const price = parseFloat(oldRequest.price || 0) || 0;
    const oldAmount = parseFloat(oldRequest.totalamt ?? (price * oldQty)) || (price * oldQty);
    const newAmount = price * newQty;
    const deltaAmount = newAmount - oldAmount;
    const wasCompleted = String(oldRequest.status) === 'Completed' || status === 'Completed';

    let updateQuery = "UPDATE filling_requests SET ";
    const updateParams = [];
    const updateFields = [];

    if (status) {
      updateFields.push("status = ?");
      updateParams.push(status);
      
      // If status is being updated to Completed, set completed_date
      if (status === "Completed") {
        updateFields.push("completed_date = NOW()");
      }
    }

    if (aqty !== undefined) {
      updateFields.push("aqty = ?");
      updateParams.push(parseFloat(aqty));
      updateFields.push("totalamt = ?");
      updateParams.push(newAmount);
    } else if (qty !== undefined) {
      updateFields.push("qty = ?");
      updateFields.push("aqty = ?");
      updateParams.push(parseFloat(qty));
      updateParams.push(parseFloat(qty));
      updateFields.push("totalamt = ?");
      updateParams.push(newAmount);
    }

    if (vehicle_number) {
      updateFields.push("vehicle_number = ?");
      updateParams.push(vehicle_number);
    }

    if (driver_number) {
      updateFields.push("driver_number = ?");
      updateParams.push(driver_number);
    }

    if (remark !== undefined) {
      updateFields.push("remark = ?");
      updateParams.push(remark);
    }

    // Add updated timestamp
    updateFields.push("updated = NOW()");

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updateQuery += updateFields.join(", ");
    updateQuery += " WHERE id = ?";
    updateParams.push(id);

    console.log('📝 Update query:', updateQuery);
    console.log('📝 Update params:', updateParams);

    const result = await executeQuery(updateQuery, updateParams);

    console.log('✅ Update result:', result);

    if (result.affectedRows > 0) {
      // Get user info for audit log
      let userId = null;
      let userName = null;
      try {
        const cookieStore = cookies();
        const token = cookieStore.get('token')?.value;
        if (token) {
          const decoded = verifyToken(token);
          if (decoded) {
            userId = decoded.userId || decoded.id;
            const users = await executeQuery(
              `SELECT id, name FROM employee_profile WHERE id = ?`,
              [userId]
            );
            if (users.length > 0) {
              userName = users[0].name;
            }
          }
        }
      } catch (userError) {
        console.error('Error getting user info:', userError);
      }

      // Financial updates only if request is Completed (existing or now)
      if ((aqty !== undefined || qty !== undefined) && wasCompleted) {
        try {
          const cid = parseInt(oldRequest.cid);
          const clientRows = await executeQuery(`SELECT client_type FROM customers WHERE id = ?`, [cid]);
          const clientType = clientRows.length ? parseInt(clientRows[0].client_type) : null;
          const balanceRows = await executeQuery(
            `SELECT amtlimit, balance FROM customer_balances WHERE com_id = ? LIMIT 1`,
            [cid]
          );
          const prevAmtLimit = balanceRows.length ? parseFloat(balanceRows[0].amtlimit || 0) : 0;
          const prevUsed = balanceRows.length ? parseFloat(balanceRows[0].balance || 0) : 0;

          if (clientType === 3) {
            await executeQuery(
              `UPDATE customer_balances SET balance = COALESCE(balance, 0) + ? WHERE com_id = ?`,
              [deltaAmount, cid]
            );
          } else {
            const nextAmtLimit = Math.max(0, prevAmtLimit - deltaAmount);
            const nextUsed = prevUsed + deltaAmount;
            await executeQuery(
              `UPDATE customer_balances SET amtlimit = ?, balance = ? WHERE com_id = ?`,
              [nextAmtLimit, nextUsed, cid]
            );
          }

          const historyRow = await executeQuery(
            `SELECT id, new_amount, remaining_limit FROM filling_history WHERE rid = ? ORDER BY filling_date DESC, id DESC LIMIT 1`,
            [oldRequest.rid]
          );
          if (historyRow.length) {
            const h = historyRow[0];
            const prevNewAmount = parseFloat(h.new_amount || oldAmount) || oldAmount;
            const updatedNewAmount = prevNewAmount + deltaAmount;
            let updatedRemaining = null;
            if (clientType !== 3) {
              const afterBalance = await executeQuery(
                `SELECT amtlimit FROM customer_balances WHERE com_id = ? LIMIT 1`,
                [cid]
              );
              updatedRemaining = afterBalance.length ? parseFloat(afterBalance[0].amtlimit || 0) : null;
            }
            await executeQuery(
              `UPDATE filling_history SET filling_qty = ?, amount = ?, new_amount = ?, remaining_limit = ? WHERE id = ?`,
              [newQty, newAmount, updatedNewAmount, updatedRemaining, h.id]
            );
          }
        } catch (finErr) {
          console.error('⚠️ Financial update error:', finErr);
        }
      }

      // Create audit log
      const newRequest = { ...oldRequest, ...body, totalamt: newAmount };
      const deltaQty = parseFloat((newQty - oldQty).toFixed(2));
      const deltaAmtLog = parseFloat((newAmount - oldAmount).toFixed(2));
      const remarksDetail = qty !== undefined 
        ? `ΔQty: ${deltaQty} L, ΔAmount: ₹${deltaAmtLog.toFixed(2)}`
        : `Request fields updated`;
      
      await createAuditLog({
        page: 'Filling Requests',
        uniqueCode: `REQUEST-${id}`,
        section: 'Edit Request',
        userId: userId,
        userName: userName,
        action: 'edit',
        remarks: `Filling request updated: ${oldRequest.rid || id}. ${remarksDetail}`,
        oldValue: oldRequest,
        newValue: newRequest,
        recordType: 'filling_request',
        recordId: parseInt(id)
      });

      return NextResponse.json({ 
        success: true, 
        message: "Request updated successfully" 
      });
    } else {
      return NextResponse.json({ 
        error: "Failed to update request" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("❌ PUT API Error:", error);
    return NextResponse.json({ 
      error: "Server error",
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const id = formData.get('id');
    const aqty = formData.get('aqty');
    const remarks = formData.get('remark') || formData.get('remarks') || '';
    const doc1 = formData.get('doc1');
    const doc2 = formData.get('doc2');
    const doc3 = formData.get('doc3');

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const rows = await executeQuery(`SELECT * FROM filling_requests WHERE id = ?`, [id]);
    if (!rows.length) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    const oldRequest = rows[0];

    let doc1Path = oldRequest.doc1 || null;
    let doc2Path = oldRequest.doc2 || null;
    let doc3Path = oldRequest.doc3 || null;

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'requests', String(id));
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    async function saveFile(file) {
      const filename = `${Date.now()}_${file.name}`;
      const filePath = path.join(uploadsDir, filename);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fs.writeFileSync(filePath, buffer);
      return `/uploads/requests/${id}/${filename}`;
    }

    if (doc1 && doc1.size > 0) doc1Path = await saveFile(doc1);
    if (doc2 && doc2.size > 0) doc2Path = await saveFile(doc2);
    if (doc3 && doc3.size > 0) doc3Path = await saveFile(doc3);

    const price = parseFloat(oldRequest.price || 0) || 0;
    const oldQty = parseFloat(oldRequest.aqty ?? oldRequest.qty ?? 0) || 0;
    const newQty = aqty !== null && aqty !== undefined ? parseFloat(aqty) || 0 : oldQty;
    const oldAmount = parseFloat(oldRequest.totalamt ?? (price * oldQty)) || (price * oldQty);
    const newAmount = price * newQty;
    const deltaAmount = newAmount - oldAmount;

    const updateQuery = `
      UPDATE filling_requests
      SET doc1 = ?, doc2 = ?, doc3 = ?, aqty = ?, totalamt = ?, remark = ?, updated = NOW()
      WHERE id = ?
    `;
    await executeQuery(updateQuery, [doc1Path, doc2Path, doc3Path, newQty, newAmount, remarks, id]);

    const wasCompleted = String(oldRequest.status) === 'Completed';
    if (wasCompleted && aqty !== null && aqty !== undefined) {
      try {
        const cid = parseInt(oldRequest.cid);
        const clientRows = await executeQuery(`SELECT client_type FROM customers WHERE id = ?`, [cid]);
        const clientType = clientRows.length ? parseInt(clientRows[0].client_type) : null;
        const balanceRows = await executeQuery(
          `SELECT amtlimit, balance FROM customer_balances WHERE com_id = ? LIMIT 1`,
          [cid]
        );
        const prevAmtLimit = balanceRows.length ? parseFloat(balanceRows[0].amtlimit || 0) : 0;
        const prevUsed = balanceRows.length ? parseFloat(balanceRows[0].balance || 0) : 0;

        if (clientType === 3) {
          await executeQuery(
            `UPDATE customer_balances SET balance = COALESCE(balance, 0) + ? WHERE com_id = ?`,
            [deltaAmount, cid]
          );
        } else {
          const nextAmtLimit = Math.max(0, prevAmtLimit - deltaAmount);
          const nextUsed = prevUsed + deltaAmount;
          await executeQuery(
            `UPDATE customer_balances SET amtlimit = ?, balance = ? WHERE com_id = ?`,
            [nextAmtLimit, nextUsed, cid]
          );
        }

        const historyRow = await executeQuery(
          `SELECT id, new_amount, remaining_limit FROM filling_history WHERE rid = ? ORDER BY filling_date DESC, id DESC LIMIT 1`,
          [oldRequest.rid]
        );
        if (historyRow.length) {
          const h = historyRow[0];
          const prevNewAmount = parseFloat(h.new_amount || oldAmount) || oldAmount;
          const updatedNewAmount = prevNewAmount + deltaAmount;
          let updatedRemaining = null;
          if (clientType !== 3) {
            const afterBalance = await executeQuery(
              `SELECT amtlimit FROM customer_balances WHERE com_id = ? LIMIT 1`,
              [cid]
            );
            updatedRemaining = afterBalance.length ? parseFloat(afterBalance[0].amtlimit || 0) : null;
          }
          await executeQuery(
            `UPDATE filling_history SET filling_qty = ?, amount = ?, new_amount = ?, remaining_limit = ? WHERE id = ?`,
            [newQty, newAmount, updatedNewAmount, updatedRemaining, h.id]
          );
        }
      } catch (finErr) {
        console.error('⚠️ Financial update error:', finErr);
      }
    }

    let userId = null;
    let userName = null;
    try {
      const cookieStore = cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId || decoded.id;
          const users = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (users.length > 0) {
            userName = users[0].name;
          }
        }
      }
    } catch {}

    try {
      const changes = JSON.stringify({
        aqty: oldRequest.aqty !== newQty ? { from: oldRequest.aqty, to: newQty } : null,
        remarks: oldRequest.remark !== remarks ? { from: oldRequest.remark, to: remarks } : null,
        doc1: doc1Path && doc1Path !== oldRequest.doc1 ? { to: doc1Path } : null,
        doc2: doc2Path && doc2Path !== oldRequest.doc2 ? { to: doc2Path } : null,
        doc3: doc3Path && doc3Path !== oldRequest.doc3 ? { to: doc3Path } : null
      });
      await executeQuery(
        `INSERT INTO edit_logs (request_id, edited_by, edited_date, old_status, new_status, old_aqty, new_aqty, changes) 
         VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`,
        [oldRequest.id, userId, oldRequest.status, oldRequest.status, oldRequest.aqty, newQty, changes]
      );
    } catch (logErr) {
      console.error('⚠️ Edit log insert failed:', logErr);
    }

    await createAuditLog({
      page: 'Filling Requests',
      uniqueCode: `REQUEST-${id}`,
      section: 'Edit Request',
      userId: userId,
      userName: userName,
      action: 'edit',
      remarks: `Filling request updated: ${oldRequest.rid || id}. ΔQty: ${(newQty - oldQty).toFixed(2)} L`,
      oldValue: oldRequest,
      newValue: { ...oldRequest, aqty: newQty, totalamt: newAmount, doc1: doc1Path, doc2: doc2Path, doc3: doc3Path, remark: remarks },
      recordType: 'filling_request',
      recordId: parseInt(id)
    });

    return NextResponse.json({ success: true, message: 'Request updated successfully' });
  } catch (error) {
    console.error('❌ POST API Error:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}
