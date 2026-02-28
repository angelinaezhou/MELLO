// PKCE + state generator + helper encoding, cookies
import crypto from "crypto";

export function base64UrlEncode(buffer: Buffer) {
    return buffer
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }
  
  export function generateCodeVerifier() {
    // 43-128 chars; we generate 64 bytes -> base64url (~86 chars)
    return base64UrlEncode(crypto.randomBytes(64));
  }
  
  export function codeChallengeFromVerifier(verifier: string) {
    const hash = crypto.createHash("sha256").update(verifier).digest();
    return base64UrlEncode(hash);
  }
  
  export function randomState() {
    return base64UrlEncode(crypto.randomBytes(16));
  }