export async function withSkewRetry<T = any>(
  fn: () => PromiseLike<{ data: T | null; error: any }> | Promise<{ data: T | null; error: any }>,
  maxRetries = 4,
  baseDelayMs = 600
): Promise<{ data: T | null; error: any }> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fn();
      if (!res.error) {
        return res as { data: T | null; error: any };
      }

      lastError = res.error;
      const isSkewError =
        res.error.code === 'PGRST303' ||
        res.error.message?.includes('JWT issued at future') ||
        res.error.message?.includes('future') ||
        res.error.status === 401;

      if (isSkewError && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(1.5, attempt);
        console.warn(
          `[Clock Skew / PGRST303] Retrying Supabase call in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return res as { data: T | null; error: any };
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(1.5, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return { data: null, error: err };
    }
  }
  return { data: null, error: lastError };
}

