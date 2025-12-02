import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token missing" }, { status: 400 });
    }

    // ---------------------------------------------------------
    // 1) ID Token verifizieren über Google Endpoint
    // ---------------------------------------------------------
    const googleResponse = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token })
      }
    );

    const googleData = await googleResponse.json();

    if (!googleData || !googleData.users || googleData.users.length === 0) {
      return NextResponse.json(
        { error: "Invalid ID token" },
        { status: 401 }
      );
    }

    const userId = googleData.users[0].localId;

    // ---------------------------------------------------------
    // 2) Sichere Session-Cookies setzen
    // ---------------------------------------------------------
    const res = NextResponse.json({ ok: true, uid: userId });

    // Auth Cookie → sagt Middleware "User existiert"
    res.cookies.set("auth", "true", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 // 1 Tag
    });

    // Optional: ID Token als NON-httpOnly Cookie, falls gebraucht
    res.cookies.set("idToken", token, {
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 // Laufzeit ID Token
    });

    return res;
  } catch (err: any) {
    console.error("❌ /api/setAuth Error: ", err?.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}