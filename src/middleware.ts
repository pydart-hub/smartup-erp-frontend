import { proxy } from "./proxy";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
