
import { prisma } from "@/lib/prisma";
import { firebaseAdminAuth } from "@/lib/firebase/admin";

export type AuthenticatedAppUser = {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  role: "AGENT" | "MANAGER";
};

export async function getAppUserFromIdToken(
  idToken: string
): Promise<AuthenticatedAppUser> {
  if (!idToken) {
    throw new Error("UNAUTHENTICATED");
  }

  let decodedToken;

  try {
    decodedToken = await firebaseAdminAuth.verifyIdToken(idToken);
  } catch {
    throw new Error("UNAUTHENTICATED");
  }

  const appUser = await prisma.appUser.findUnique({
    where: {
      firebaseUid: decodedToken.uid,
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
    throw new Error("UNAUTHORIZED");
  }

  return {
    id: appUser.id,
    firebaseUid: appUser.firebaseUid,
    email: appUser.email,
    displayName: appUser.displayName,
    role: appUser.role,
  };
}
