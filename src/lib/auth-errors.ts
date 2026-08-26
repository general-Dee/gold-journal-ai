const FRIENDLY_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/invalid-email": "That email address doesn't look valid.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network error — check your connection and try again."
};

export function friendlyAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  if (code && FRIENDLY_MESSAGES[code]) {
    return FRIENDLY_MESSAGES[code];
  }
  return "Something went wrong. Please try again.";
}
