export function shortAddress(wallet: string, chars = 4): string {
  if (wallet.length <= chars * 2 + 2) return wallet;
  return `${wallet.slice(0, chars)}…${wallet.slice(-chars)}`;
}
