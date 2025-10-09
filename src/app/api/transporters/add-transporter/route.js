import { executeQuery } from "@/lib/db";
import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";

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
    await executeQuery(query, [transporter_name, email, phone, address, frontFile, backFile]);

    return NextResponse.json({ success: true, message: "New record created successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error", error: err.message });
  }
}
