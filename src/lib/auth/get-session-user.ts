
import { cookies } from "next/headers";
import { firebaseAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "willis_port_session";

export type SessionAppUser = {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  role: "AGENT" | "MANAGER";
};

export async function getSessionUser(): Promise<SessionAppUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedClaims =
      await firebaseAdminAuth.verifySessionCookie(sessionCookie, true);

    const appUser = await prisma.appUser.findUnique({
      where: {
        firebaseUid: decodedClaims.uid,
      },
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        displayName: true,
        role: true,
        active: true,
      },
    });

    if (!appUser || !appUser.active) {
      return null;
    }

    return {
      id: appUser.id,
      firebaseUid: appUser.firebaseUid,
      email: appUser.email,
      displayName: appUser.displayName,
      role: appUser.role,
    };
  } catch {
    return null;
  }
}

