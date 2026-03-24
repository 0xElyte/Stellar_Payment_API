const RETRY_DELAYS_MS = [10_000, 30_000, 60_000]; // 10s, 30s, 60s

async function attempt(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "stellar-payment-api/0.1"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text().catch(() => "");
  return { ok: response.ok, status: response.status, body: text };
}

function scheduleRetries(url, payload) {
  let attemptIndex = 0;

  function retry() {
    attempt(url, payload).then((result) => {
      if (!result.ok && attemptIndex < RETRY_DELAYS_MS.length - 1) {
        attemptIndex++;
        setTimeout(retry, RETRY_DELAYS_MS[attemptIndex]);
      }
    }).catch(() => {
      if (attemptIndex < RETRY_DELAYS_MS.length - 1) {
        attemptIndex++;
        setTimeout(retry, RETRY_DELAYS_MS[attemptIndex]);
      }
    });
  }

  setTimeout(retry, RETRY_DELAYS_MS[0]);
}

export async function sendWebhook(url, payload) {
  if (!url) return { ok: false, skipped: true };

  try {
    const result = await attempt(url, payload);

    if (!result.ok) {
      scheduleRetries(url, payload);
    }

    return result;
  } catch (err) {
    scheduleRetries(url, payload);
    return { ok: false, error: err.message };
  }
}
