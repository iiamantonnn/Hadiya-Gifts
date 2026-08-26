import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { api } from "./api";
import type { User } from "./types";

interface OptionsResponse {
  options: string;
  challenge_id: string;
}

export async function registerPasskey(nickname?: string): Promise<void> {
  const { options, challenge_id } = await api.post<OptionsResponse>("/webauthn/register/options");
  const credential = await startRegistration({ optionsJSON: JSON.parse(options) });
  await api.post("/webauthn/register/verify", { challenge_id, credential, nickname: nickname || null });
}

export async function loginWithPasskey(email?: string): Promise<User> {
  const { options, challenge_id } = await api.post<OptionsResponse>("/webauthn/login/options", { email: email || null });
  const credential = await startAuthentication({ optionsJSON: JSON.parse(options) });
  return api.post<User>("/webauthn/login/verify", { challenge_id, credential });
}
