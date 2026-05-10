import { NextResponse } from "next/server";
import { sendGenericReportEmail } from "@/lib/email";

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, data, recipient_email, footer_note } = body;

    if (!title || !data || !Array.isArray(data)) {
      return NextResponse.json({ success: false, error: 'Title and Data array are required' }, { status: 400 });
    }

    const result = await sendGenericReportEmail(title, data, recipient_email, footer_note);

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
