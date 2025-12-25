import { executeQuery } from "@/lib/db";
import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";
import { createAuditLog } from "@/lib/auditLog";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req) {
  try {
    const body = await req.json();
    const { transporter_name, email, phone, address, adhar_front, adhar_back } = body;

    const uploadDir = path.join(process.cwd(), "public/uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    function saveBase64(base64String, prefix) {
      if (!base64String) return null;
      const matches = base64String.match(/^data:.+\/(.+);base64,(.*)$/);
      const ext = matches[1];
      const data = matches[2];
      const filename = `${prefix}_${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(data, "base64"));
      return filename;
    }

    const frontFile = saveBase64(adhar_front, "front");
    const backFile = saveBase64(adhar_back, "back");

    // Insert into DB
    const query = `
      INSERT INTO transporters (transporter_name, email, phone, address, adhar_front, adhar_back)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await executeQuery(query, [transporter_name, email, phone, address, frontFile, backFile]);

    // Get current user for audit log
    let userId = null;
    let userName = null;
    try {
      const currentUser = await getCurrentUser();
      userId = currentUser?.userId || null;
      userName = currentUser?.userName || null;
      
      if (!userName && userId) {
        const users = await executeQuery(
          `SELECT name FROM employee_profile WHERE id = ?`,
          [userId]
        );
        if (users.length > 0) {
          userName = users[0].name;
        }
      }
    } catch (userError) {
      console.error('Error getting user info:', userError);
    }

    // Create audit log
    try {
      await createAuditLog({
        page: 'Transporters',
        uniqueCode: result.insertId.toString(),
        section: 'Transporter Management',
        userId: userId,
        userName: userName,
        action: 'create',
        remarks: `New transporter created: ${transporter_name} (Email: ${email}, Phone: ${phone})`,
        oldValue: null,
        newValue: {
          transporter_id: result.insertId,
          transporter_name,
          email,
          phone,
          address
        },
        recordType: 'transporter',
        recordId: result.insertId
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json({ success: true, message: "New record created successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error", error: err.message });
  }
}
