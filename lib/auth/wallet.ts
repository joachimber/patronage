import nacl from "tweetnacl";
import bs58 from "bs58";

/**
 * Patronage sign-in flow. Nonce issued server-side → user signs with
 * Phantom/Solflare → server verifies via ed25519.
 *
 * The message is deliberately human-readable — holders should see what
 * they're signing in their wallet dialog.
 */

export interface SigninMessage {
  statement: string;
  domain: string;
  nonce: string;
  wallet: string;
  issuedAt: string;
}

export function buildMessage(m: SigninMessage): string {
  return [
    `Patronage — sign-in`,
    ``,
    m.statement,
    ``,
    `Domain:    ${m.domain}`,
    `Wallet:    ${m.wallet}`,
    `Nonce:     ${m.nonce}`,
    `Issued at: ${m.issuedAt}`,
  ].join("\n");
}

export function makeNonce(): string {
  const bytes = nacl.randomBytes(16);
  return bs58.encode(bytes);
}

export interface VerifyInput {
  message: string;
  signatureBs58: string;
  walletBs58: string;
}

export function verifyWalletSignature({
  message,
  signatureBs58,
  walletBs58,
}: VerifyInput): boolean {
  try {
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = bs58.decode(signatureBs58);
    const pkBytes = bs58.decode(walletBs58);
    if (sigBytes.length !== 64 || pkBytes.length !== 32) return false;
    return nacl.sign.detached.verify(msgBytes, sigBytes, pkBytes);
  } catch {
    return false;
  }
}
