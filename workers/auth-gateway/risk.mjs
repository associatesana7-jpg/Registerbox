// Pure policy: inputs come from trusted gateway counters, never client scores.
export function decideAuthRisk({ attempts, failures, emailAttempts, remembered, userAgent }) {
  if (![attempts, failures, emailAttempts].every(value => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error('Invalid risk counters');
  }
  // Never allow a remembered-device hint or a solved CAPTCHA to bypass a flood.
  if (attempts > 80 || failures > 25) return 'deny';
  let score = remembered ? 0 : 10;
  if (!userAgent || userAgent.length < 8) score += 35;
  if (attempts > 5) score += 40;
  if (failures > 2) score += 50;
  if (emailAttempts > 3) score += 40;
  // Recipient volume alone can require proof, but never locks that account out.
  return score >= 40 ? 'challenge' : 'allow';
}

export const RISK_WINDOW_MS = 5 * 60_000;
export function reserveAttempt(previous, now) {
  const current = previous && now < previous.started + RISK_WINDOW_MS && now >= previous.started
    ? previous : { started: now, attempts: 0, failures: 0 };
  return { ...current, attempts: Math.min(current.attempts + 1, 1_000_000) };
}
