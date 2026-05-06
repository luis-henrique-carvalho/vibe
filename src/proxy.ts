import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set(
      "redirectTo",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );

    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/projects/:path*"],
};
