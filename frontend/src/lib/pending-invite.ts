// Carries a pairing-invitation token across the login/register/verify-email
// detour so a signed-out visitor who opened a /pair/:token link lands back
// on it instead of the dashboard once they're authenticated.
const KEY = "hadiya_pending_invite_token";

export function setPendingInvite(token: string) {
  sessionStorage.setItem(KEY, token);
}

export function consumePendingInvite(): string | null {
  const token = sessionStorage.getItem(KEY);
  if (token) sessionStorage.removeItem(KEY);
  return token;
}
