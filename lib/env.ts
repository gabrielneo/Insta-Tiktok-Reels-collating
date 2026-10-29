import "server-only";
import { parseEnv } from "./envSchema";

// Validated, read-only environment for server code. Importing this from a
// client component is a build error (via "server-only"), which keeps API
// keys out of browser bundles.
export const env = parseEnv(process.env);
