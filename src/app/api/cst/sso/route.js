
import { verifyToken } from "@/lib/cstauth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret';

// Need to import verifyToken from cstauth likely, or just reuse auth if token format is same
// Checking cstauth content previously: it has verifyToken.

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("cst_token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const decoded = verifyToken(token); // Using cstauth verify
        if (!decoded) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // SSO Token Payload
        const ssoPayload = {
            id: decoded.userId || decoded.id,
            role: decoded.role,
            type: "customer_sso",
            timestamp: Date.now()
        };

        // Sign a short-lived token (1 minute)
        const ssoToken = jwt.sign(ssoPayload, JWT_SECRET, { expiresIn: "60s" });

        // The PHP endpoint for customers
        const targetUrl = `https://masafipetro.com/new/cst/sso_login.php?token=${ssoToken}`;

        return NextResponse.json({ success: true, ssoUrl: targetUrl });

    } catch (error) {
        console.error("SSO Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
