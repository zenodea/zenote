import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };

// The sign-in UI lives in Frame (root layout) so the seams and junction marks
// persist across the auth transition instead of mounting with the page.
export default function LoginPage() {
  return null;
}
