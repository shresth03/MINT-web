const FRONTEND_URL = process.env.FRONTEND_URL;

if (!FRONTEND_URL) {
  throw new Error("FRONTEND_URL environment variable is missing");
}

export { FRONTEND_URL };
