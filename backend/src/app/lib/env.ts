// env validation helper
function req(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
  }
  
  export const env = {
    SPOTIFY_CLIENT_ID: req("SPOTIFY_CLIENT_ID"),
    SPOTIFY_CLIENT_SECRET: req("SPOTIFY_CLIENT_SECRET"),
    SPOTIFY_REDIRECT_URI: req("SPOTIFY_REDIRECT_URI"),
    APP_URL: process.env.APP_URL ?? "http://localhost:3001",
  };