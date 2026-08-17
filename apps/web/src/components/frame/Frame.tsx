"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { Centered, Mark, Seam, Trace } from "@/components/frame/Seams";
import {
  ENTER_MS,
  LEAVE_MS,
  fallbackGeometry,
  type Geometry,
} from "@/lib/frame";
import { useLayoutMode } from "@/hooks/use-media-query";
import { prefersReducedMotion } from "@/lib/motion";
import { RETURN_PARAM, safeReturnTo } from "@/lib/return-to";
import { endLeaving, useLeaving } from "@/lib/stores/leaving";
import { useSettings } from "@/lib/stores/settings";
import { createClient } from "@/lib/supabase/client";

const LOGIN = "/login";
const MAX_BOX = 520;
const MIN_BOX = 440;
const MARK_SIZE = 6;
const FADE_MS = 160;
const CLOSE_MS = 720;
const LINES_MS = 420;
const MIN_TRACE_MS = 500;
const WARM_TIMEOUT_MS = 8000;
const ENTER_FAILSAFE_MS = 8000;
const EASE = "cubic-bezier(0.7, 0, 0.2, 1)";

// in: idle→working→closing→framing→app   out: app→(leaving)→unframing→opening→idle
type Phase =
  "app" | "unframing" | "opening" | "idle" | "working" | "closing" | "framing";

type Env = { width: number; height: number; reduce: boolean };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Read off the URL, not useSearchParams, which would force a Suspense boundary in the root layout.
function returnTo(): string {
  const param = new URLSearchParams(window.location.search).get(RETURN_PARAM);
  return safeReturnTo(param) ?? "/";
}

export function Frame() {
  const router = useRouter();
  const settings = useSettings();
  const leaving = useLeaving();
  const phone = useLayoutMode() === "phone";
  // From the URL, not a prop: the root layout is shared with /login and isn't re-rendered by sign-in.
  const authed = usePathname() !== LOGIN;
  const [env, setEnv] = useState<Env | null>(null);
  const [rawPhase, setPhase] = useState<Phase>(authed ? "app" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);

  // An unchoreographed logged-out arrival would otherwise strand "app" and deaden the form.
  const phase: Phase =
    !authed && !leaving.active && rawPhase === "app" ? "idle" : rawPhase;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const measure = () =>
      setEnv({
        width: window.innerWidth,
        height: window.innerHeight,
        reduce: prefersReducedMotion(),
      });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(timer.current ?? undefined);
      delete document.body.dataset.entering;
    },
    [],
  );

  useEffect(() => {
    if (!authed) return;
    const id = requestAnimationFrame(() => setPhase("app"));
    return () => cancelAnimationFrame(id);
  }, [authed]);

  // Hold the fade until the chrome mounts (`authed` flips); the failsafe covers a navigation that never lands.
  useEffect(() => {
    if (!entering) return;

    const id = setTimeout(
      () => {
        delete document.body.dataset.entering;
        setEntering(false);
      },
      authed ? ENTER_MS : ENTER_FAILSAFE_MS,
    );
    return () => clearTimeout(id);
  }, [entering, authed]);

  // Arrived logged-out with the frame still drawn: retract it, then open.
  useEffect(() => {
    if (authed || !leaving.active) return;

    const id = requestAnimationFrame(() => {
      setPhase("unframing");
      endLeaving();
      timer.current = setTimeout(() => {
        setPhase("opening");
        timer.current = setTimeout(() => setPhase("idle"), CLOSE_MS + FADE_MS);
      }, LINES_MS);
    });
    return () => cancelAnimationFrame(id);
  }, [authed, leaving.active]);

  // A resize since the measurement pins `foot` to the old viewport height.
  const geometry: Geometry = useMemo(() => {
    const measured =
      leaving.geometry && leaving.viewportHeight === env?.height
        ? leaving.geometry
        : null;

    return (
      measured ??
      fallbackGeometry(settings.sidebarCollapsed, env?.height ?? 0, !phone)
    );
  }, [
    leaving.geometry,
    leaving.viewportHeight,
    settings.sidebarCollapsed,
    env?.height,
    phone,
  ]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase !== "idle") return;

    const form = new FormData(event.currentTarget);
    setPhase("working");
    setError(null);

    const { error: failure } = await createClient().auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    if (failure) {
      setPhase("idle");
      setError(
        failure.message === "Invalid login credentials"
          ? "That email and password don’t match."
          : failure.message,
      );
      return;
    }

    const destination = returnTo();

    // Body must be read, not just awaited: an abandoned response leaves the render stream unconsumed.
    await Promise.all([
      Promise.race([
        fetch(destination, { cache: "no-store" })
          .then((response) => response.text())
          .catch(() => {}),
        wait(WARM_TIMEOUT_MS),
      ]),
      wait(MIN_TRACE_MS),
    ]);
    router.prefetch(destination);

    if (env?.reduce) {
      enter(destination);
      return;
    }

    setPhase("closing");
    timer.current = setTimeout(() => {
      setPhase("framing");
      timer.current = setTimeout(() => enter(destination), LINES_MS);
    }, FADE_MS + CLOSE_MS);
  }

  function enter(destination: string) {
    // Set before navigating so the chrome is transparent on its first paint.
    if (!reduce) {
      document.body.dataset.entering = "true";
      setEntering(true);
    }

    router.replace(destination);
  }

  const reduce = env?.reduce ?? false;

  const drawn = authed || leaving.active || phase === "framing";
  const shut =
    authed ||
    leaving.active ||
    phase === "unframing" ||
    phase === "closing" ||
    phase === "framing";

  const crossfade = reduce
    ? 0
    : leaving.active
      ? LEAVE_MS
      : entering
        ? ENTER_MS
        : 0;

  const lines: CSSProperties = {
    opacity: authed && !leaving.active ? 0 : 1,
    transitionProperty: "opacity",
    transitionDuration: crossfade ? `${crossfade}ms` : "0ms",
  };
  const draw = reduce ? "none" : `transform ${LINES_MS}ms ${EASE}`;

  // The measurement outlives the sign-out and would frame a panel that has closed.
  const panel =
    leaving.active || phase === "unframing" || phase === "opening"
      ? geometry.panel
      : null;

  const form = (
    <LoginForm
      busy={phase === "working"}
      error={error}
      hidden={shut}
      delay={phase === "opening" && !reduce ? CLOSE_MS : 0}
      duration={reduce ? 0 : FADE_MS}
      onSubmit={onSubmit}
    />
  );

  // Before measurement, ship the form alone so /login is never an empty document.
  if (!env) return authed ? null : <Centered>{form}</Centered>;

  const box = Math.min(MAX_BOX, env.width - 40, env.height - 40);
  const compact = box < MIN_BOX;
  const rails = geometry.sidebar > 0;
  const anchor = rails ? geometry.x : env.width / 2;

  return (
    <div data-frame aria-hidden={authed ? true : undefined}>
      <Seam
        className="left-0 h-px w-screen"
        style={{ ...lines, top: geometry.head - 0.5 }}
        origin={`${anchor}px center`}
        axis="X"
        open={drawn}
        transition={draw}
      />
      {rails && (
        <Seam
          className="top-0 h-dvh w-px"
          style={{ ...lines, left: geometry.x - 0.5 }}
          origin={`center ${geometry.head}px`}
          axis="Y"
          open={drawn}
          transition={draw}
        />
      )}
      {rails && (
        <Seam
          className="left-0 h-px"
          style={{
            ...lines,
            top: geometry.foot - 0.5,
            width: geometry.sidebar,
          }}
          origin={`${geometry.x}px center`}
          axis="X"
          open={drawn}
          transition={draw}
        />
      )}

      {/* The assistant panel, when it was open, leaves with the same grace. */}
      {panel && (
        <Seam
          className="top-0 h-dvh w-px"
          style={{ ...lines, left: panel.x - 0.5 }}
          origin={`center ${geometry.head}px`}
          axis="Y"
          open={drawn}
          transition={draw}
        />
      )}
      {panel && panel.foot !== null && (
        <Seam
          className="h-px"
          style={{
            ...lines,
            top: panel.foot - 0.5,
            left: panel.x,
            width: env.width - panel.x,
          }}
          origin="0px center"
          axis="X"
          open={drawn}
          transition={draw}
        />
      )}

      {/* Every point where the seams cross, matching what Junctions draws.
          Retracting, they travel with the lines into the main junction — the
          point the login diamond opens from. */}
      {[
        ...(rails
          ? [
              { x: geometry.x, y: geometry.head },
              { x: geometry.x, y: geometry.foot },
            ]
          : []),
        ...(panel
          ? [
              { x: panel.x, y: geometry.head },
              ...(panel.foot !== null
                ? [{ x: panel.x, y: panel.foot }]
                : []),
            ]
          : []),
      ].map(({ x, y }) => (
        <Mark
          key={`${x}:${y}`}
          style={{
            ...lines,
            left: drawn ? x : anchor,
            top: drawn ? y : geometry.head,
            opacity: (lines.opacity as number) * (drawn ? 1 : 0),
            transitionProperty: "left, top, opacity",
            transitionTimingFunction: EASE,
            // Hands off to the real junction marks, so it fades on the seams' clock.
            transitionDuration: crossfade
              ? `${crossfade}ms`
              : reduce
                ? "0ms"
                : drawn
                  ? `${FADE_MS}ms`
                  : `${LINES_MS}ms`,
            transitionDelay: drawn && !reduce ? `${LINES_MS * 0.6}ms` : "0ms",
          }}
        />
      ))}

      {!compact && (
        <div
          className="fixed z-10"
          style={{
            left: shut ? anchor : env.width / 2,
            top: shut ? geometry.head : env.height / 2,
            opacity: lines.opacity,
            transition: reduce
              ? "none"
              : `left ${CLOSE_MS}ms ${EASE} ${phase === "closing" ? FADE_MS : 0}ms, top ${CLOSE_MS}ms ${EASE} ${phase === "closing" ? FADE_MS : 0}ms`,
          }}
        >
          <div
            aria-hidden
            className="absolute -translate-x-1/2 -translate-y-1/2 rotate-45 border border-foreground/30 bg-background"
            style={{
              width: shut ? MARK_SIZE : box / Math.SQRT2,
              height: shut ? MARK_SIZE : box / Math.SQRT2,
              transition: reduce
                ? "none"
                : `width ${CLOSE_MS}ms ${EASE} ${phase === "closing" ? FADE_MS : 0}ms, height ${CLOSE_MS}ms ${EASE} ${phase === "closing" ? FADE_MS : 0}ms`,
            }}
          />
          <Trace
            side={shut ? MARK_SIZE : box / Math.SQRT2}
            active={phase === "working"}
          />
          {!authed && (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ width: Math.min(280, box * 0.54) }}
            >
              {form}
            </div>
          )}
        </div>
      )}

      {!authed && compact && <Centered>{form}</Centered>}
    </div>
  );
}
