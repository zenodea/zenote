import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { RETURN_PARAM } from "@/lib/return-to";
import { supabaseEnv } from "@/lib/supabase/env";

const LOGIN = "/login";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (written) => {
        for (const { name, value } of written) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of written) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const { pathname } = request.nextUrl;
  const onLogin = pathname === LOGIN;
  const desktop = request.headers.get("x-zenote-desktop") === "1";

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return carry(
        NextResponse.json({ error: "Not authenticated." }, { status: 401 }),
        response,
      );
    }
    if (!onLogin && !desktop) return redirect(request, LOGIN, response);
  }

  if (user && onLogin) return redirect(request, "/", response);

  return response;
}

function redirect(request: NextRequest, to: string, carrying: NextResponse) {
  const url = request.nextUrl.clone();
  const from = request.nextUrl.pathname + request.nextUrl.search;

  url.pathname = to;
  url.search = "";
  if (to === LOGIN && from !== "/") url.searchParams.set(RETURN_PARAM, from);

  return carry(NextResponse.redirect(url), carrying);
}

function carry(response: NextResponse, carrying: NextResponse) {
  for (const cookie of carrying.cookies.getAll()) response.cookies.set(cookie);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico$|icon\\.svg$|sw\\.js$|manifest\\.webmanifest$|apple-touch-icon\\.png$|icon-192\\.png$|icon-512\\.png$|icon-maskable-512\\.png$).*)",
  ],
};
