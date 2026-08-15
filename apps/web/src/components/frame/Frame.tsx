"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LogoIcon } from "@/components/ui/Icons";
import {
  ENTER_MS,
  LEAVE_MS,
  fallbackGeometry,
  type Geometry,
} from "@/lib/frame";
import { endLeaving, useLeaving } from "@/lib/leaving";
import { RETURN_PARAM, safeReturnTo } from "@/lib/return-to";
import { useSettings } from "@/lib/settings";
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

// Sign in:  idle → working → closing → framing → app
// Sign out: app → (leaving) → unframing → opening → idle
type Phase =
  | "app"
  | "unframing"
  | "opening"
  | "idle"
  | "working"
  | "closing"
  | "framing";

type Env = { width: number; height: number; reduce: boolean };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Where middleware was taking them before it stopped at /login. Read off the
 * URL at submit time rather than through useSearchParams, which would force a
 * Suspense boundary around Frame in the root layout.
 */
function returnTo(): string {
  const param = new URLSearchParams(window.location.search).get(RETURN_PARAM);
  return safeReturnTo(param) ?? "/";
}

export function Frame() {
  const router = useRouter();
  const settings = useSettings();
  const leaving = useLeaving();
  // Read from the URL rather than passed down from the root layout: that layout
  // is shared with /login and so is not re-rendered by the sign-in navigation,
  // which would leave a server-passed prop stale. Middleware keeps /login and
  // "signed out" equivalent.
  const authed = usePathname() !== LOGIN;
  const [env, setEnv] = useState<Env | null>(null);
  const [rawPhase, setPhase] = useState<Phase>(authed ? "app" : "idle");
  const [error, setError] = useState<string | null>(null);
  // True only for the length of the arrival cross-fade.
  const [entering, setEntering] = useState(false);

  // Frame outlives soft navigations, so the state can still say "app" after we
  // arrive logged-out by a route nothing choreographed — a reduced-motion sign
  // out, or a session that expired mid-navigation. Left alone, the form would
  // render but onSubmit's `phase !== "idle"` guard would swallow every attempt
  // until a hard reload.
  const phase: Phase =
    !authed && !leaving.active && rawPhase === "app" ? "idle" : rawPhase;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const measure = () =>
      setEnv({
        width: window.innerWidth,
        height: window.innerHeight,
        reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(timer.current ?? undefined);
      // Frame lives in the root layout and shouldn't unmount, but leaving this
      // behind would animate every later mount of the app chrome.
      delete document.body.dataset.entering;
    },
    [],
  );

  // Signed back in: the real chrome now owns these pixels.
  useEffect(() => {
    if (!authed) return;
    const id = requestAnimationFrame(() => setPhase("app"));
    return () => cancelAnimationFrame(id);
  }, [authed]);

  // The cross-fade can only start once the chrome is actually mounted, which is
  // when `authed` flips — the navigation that gets us there takes as long as it
  // takes. Until then the attribute just has to stay put. The longer wait when
  // it hasn't arrived is a failsafe: a navigation that never lands would
  // otherwise leave every child of body stuck at opacity 0.
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
        timer.current = setTimeout(
          () => setPhase("idle"),
          CLOSE_MS + FADE_MS,
        );
      }, LINES_MS);
    });
    return () => cancelAnimationFrame(id);
  }, [authed, leaving.active]);

  // Measured off the live chrome on the way out; constants on a cold login, or
  // when the window was resized since — the measurement's `foot` is pinned to
  // the old viewport height and would draw the seam off-screen.
  const geometry: Geometry = useMemo(() => {
    const measured =
      leaving.geometry && leaving.viewportHeight === env?.height
        ? leaving.geometry
        : null;

    return (
      measured ?? fallbackGeometry(settings.sidebarCollapsed, env?.height ?? 0)
    );
  }, [
    leaving.geometry,
    leaving.viewportHeight,
    settings.sidebarCollapsed,
    env?.height,
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

    // Render the vault server-side first, so the frame closes onto a painted
    // app rather than a blank page. The body has to be read, not just awaited:
    // dropping the response leaves the server's render stream with no consumer,
    // which is what piles up "drain listeners added to [Gzip]" warnings and
    // then throws "The destination stream closed early".
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

  // A plain navigation: /login and the destination sit in different layout
  // groups, so (app)/layout.tsx mounts and paints on its own. No router.refresh()
  // — that re-rendered the entire tree from the server and read as a page reload.
  function enter(destination: string) {
    // Set before the navigation so the chrome is already transparent on its
    // first paint. Clearing it is the arrival effect's job, not a timer started
    // here — the navigation routinely outlasts ENTER_MS.
    if (!reduce) {
      document.body.dataset.entering = "true";
      setEntering(true);
    }

    router.replace(destination);
  }

  const reduce = env?.reduce ?? false;

  // Drawn whenever the chrome is (or is becoming) absent. While signed in it
  // sits at opacity 0 underneath the real borders.
  const drawn = authed || leaving.active || phase === "framing";
  const shut =
    authed || leaving.active || phase === "unframing" || phase === "closing" || phase === "framing";

  // Signing out fades the chrome away under the seams; signing in does the
  // reverse. Both sides of the cross-fade have to run for the same length.
  const crossfade = reduce
    ? 0
    : leaving.active
      ? LEAVE_MS
      : entering
        ? ENTER_MS
        : 0;

  const lines: CSSProperties = {
    opacity: authed && !leaving.active ? 0 : 1,
    // Cross-fades with the chrome in both directions. Instant only when there
    // is no chrome to cross-fade with, so the real borders never take over
    // through a moment of doubled lines.
    transitionProperty: "opacity",
    transitionDuration: crossfade ? `${crossfade}ms` : "0ms",
  };
  const draw = reduce ? "none" : `transform ${LINES_MS}ms ${EASE}`;

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

  // The seams need a measured viewport, which only exists on the client. Ship
  // the form by itself until then, so /login is never an empty document and
  // there is no blank flash between first paint and the measuring effect.
  if (!env) return authed ? null : <Centered>{form}</Centered>;

  const box = Math.min(MAX_BOX, env.width - 40, env.height - 40);
  const compact = box < MIN_BOX;

  return (
    <div data-frame aria-hidden={authed ? true : undefined}>
      <Seam
        className="left-0 h-px w-screen"
        style={{ ...lines, top: geometry.head - 0.5 }}
        origin={`${geometry.x}px center`}
        axis="X"
        open={drawn}
        transition={draw}
      />
      <Seam
        className="top-0 h-screen w-px"
        style={{ ...lines, left: geometry.x - 0.5 }}
        origin={`center ${geometry.head}px`}
        axis="Y"
        open={drawn}
        transition={draw}
      />
      <Seam
        className="left-0 h-px"
        style={{ ...lines, top: geometry.foot - 0.5, width: geometry.sidebar }}
        origin={`${geometry.x}px center`}
        axis="X"
        open={drawn}
        transition={draw}
      />

      {/* The three seams above cross at two points, and Junctions puts a mark
          at both. Drawing only the footer one left the header junction with
          nothing to hand over from, so it appeared out of nothing the moment
          the chrome took over. */}
      {[geometry.head, geometry.foot].map((y) => (
        <Mark
          key={y}
          style={{
            ...lines,
            left: geometry.x,
            top: y,
            opacity: (lines.opacity as number) * (drawn ? 1 : 0),
            // Hands off to the real junction marks, so it has to fade on the
            // same clock as the seams rather than its usual quicker FADE_MS.
            transitionDuration: crossfade
              ? `${crossfade}ms`
              : reduce
                ? "0ms"
                : `${FADE_MS}ms`,
            transitionDelay: drawn && !reduce ? `${LINES_MS * 0.6}ms` : "0ms",
          }}
        />
      ))}

      {!compact && (
        <div
          className="fixed z-10"
          style={{
            left: shut ? geometry.x : env.width / 2,
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

/** The form with no frame around it: too small a viewport, or not measured yet. */
function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center px-6">
      <div className="w-full max-w-[280px]">{children}</div>
    </div>
  );
}

function Mark({ style }: { style: CSSProperties }) {
  return (
    <span
      aria-hidden
      style={style}
      className="pointer-events-none fixed z-10 size-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-foreground/30 bg-background transition-opacity"
    />
  );
}

function Seam({
  className,
  style,
  origin,
  axis,
  open,
  transition,
}: {
  className: string;
  style: CSSProperties;
  origin: string;
  axis: "X" | "Y";
  open: boolean;
  transition: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed bg-foreground/15 ${className}`}
      style={{
        ...style,
        transformOrigin: origin,
        transform: `scale${axis}(${open ? 1 : 0})`,
        transition: `${transition}, ${style.transitionProperty} ${style.transitionDuration}`,
      }}
    />
  );
}

function Trace({ side, active }: { side: number; active: boolean }) {
  const perimeter = 4 * (side - 1);

  return (
    <svg
      aria-hidden
      width={side}
      height={side}
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rotate-45 transition-opacity duration-300"
      style={{ opacity: active ? 1 : 0 }}
    >
      <rect
        x={0.5}
        y={0.5}
        width={side - 1}
        height={side - 1}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        style={{
          ["--trace" as string]: `${perimeter}px`,
          strokeDasharray: `${perimeter * 0.16} ${perimeter * 0.84}`,
          animation: active ? "diamond-trace 1.4s linear infinite" : "none",
        }}
      />
    </svg>
  );
}

function LoginForm({
  busy,
  error,
  hidden,
  delay,
  duration,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  hidden: boolean;
  delay: number;
  duration: number;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      inert={hidden}
      className="flex flex-col items-center gap-3 transition-opacity"
      style={{
        opacity: hidden ? 0 : 1,
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      <LogoIcon />
      <h1 className="sr-only">Sign in to Zenote</h1>

      <Field name="email" type="email" label="Email" autoFocus />
      <Field name="password" type="password" label="Password" />

      <Button variant="solid" type="submit" disabled={busy} className="mt-1 w-full">
        {busy ? "Opening your vault…" : "Sign in"}
      </Button>

      <p role="alert" className="min-h-[1.25rem] text-center text-sm text-red-500">
        {error}
      </p>
    </form>
  );
}

function Field({
  name,
  type,
  label,
  autoFocus,
}: {
  name: string;
  type: string;
  label: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      name={name}
      type={type}
      required
      autoFocus={autoFocus}
      autoComplete={type === "password" ? "current-password" : "email"}
      placeholder={label}
      aria-label={label}
      className="w-full rounded border border-foreground/15 bg-background px-2 py-1.5 placeholder:opacity-50 focus:border-foreground/40 focus:outline-none"
    />
  );
}
