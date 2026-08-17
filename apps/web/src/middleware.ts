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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const onLogin = pathname === LOGIN;

  if (!user) {
    // A redirect here is a method-preserving 307, so fetch would POST to /login and stream its HTML back.
    if (pathname.startsWith("/api/")) {
      return carry(
        NextResponse.json({ error: "Not authenticated." }, { status: 401 }),
        response,
      );
    }
    if (!onLogin) return redirect(request, LOGIN, response);
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
  // An open-ended `.*\.svg$` would exempt any route ending in .svg, not just static assets.
  // The manifest and its icons are named in full for the same reason: a browser
  // fetches both without credentials, so a guarded one redirects and never installs.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico$|icon\\.svg$|manifest\\.webmanifest$|apple-touch-icon\\.png$|icon-192\\.png$|icon-512\\.png$|icon-maskable-512\\.png$).*)",
  ],
};
