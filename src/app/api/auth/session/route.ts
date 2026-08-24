
import { NextResponse } from "next/server";
import { firebaseAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "willis_port_session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken = body?.idToken;

    if (typeof idToken !== "string" || !idToken) {
      return NextResponse.json(
        { error: "Missing Firebase ID token." },
        { status: 400 }
      );
    }

    const decodedToken = await firebaseAdminAuth.verifyIdToken(idToken);

    const appUser = await prisma.appUser.findUnique({
      where: {
        firebaseUid: decodedToken.uid,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        active: true,
      },
    });

    if (!appUser || !appUser.active) {
      return NextResponse.json(
        { error: "User is not authorized for Willis Port." },
        { status: 403 }
      );
    }

    const expiresIn = 1000 * 60 * 60 * 8;

    const sessionCookie =
      await firebaseAdminAuth.createSessionCookie(idToken, {
        expiresIn,
      });

    const response = NextResponse.json({
      user: {
        id: appUser.id,
        email: appUser.email,
        displayName: appUser.displayName,
        role: appUser.role,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to create session." },
      { status: 401 }
    );
  }
}
