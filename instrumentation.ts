// Runs once when the Next.js server boots. Validating here makes a
// misconfigured .env fail at startup instead of on the first API request.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { parseEnv } = await import("./lib/envSchema");
    try {
      parseEnv(process.env);
    } catch (error) {
      // Next.js 14 logs instrumentation errors but keeps serving, so exit
      // explicitly to stop a misconfigured server from accepting traffic.
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
}
