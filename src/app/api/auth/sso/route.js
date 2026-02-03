
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = verifyToken(token);
        if (!user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // SSO Token Payload
        const ssoPayload = {
            id: user.userId,
            role: user.role,
            type: "employee_sso",
            timestamp: Date.now()
        };

        // Sign a short-lived token (1 minute) for SSO exchange
        const ssoToken = jwt.sign(ssoPayload, JWT_SECRET, { expiresIn: "60s" });

        // The PHP endpoint that will handle this token
        // Adjust domain as per production
        const targetUrl = `https://masafipetro.com/new/sso_login.php?token=${ssoToken}`;

        return NextResponse.json({ success: true, ssoUrl: targetUrl });

    } catch (error) {
        console.error("SSO Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
