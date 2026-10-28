// Cloudflare Pages Function middleware: runs before every /api/* route.
// Only requests carrying a valid Supabase session (a signed-in user of the app) get through.
// The publishable key is public by design (it is also in index.html); it only identifies the project.
const SUPABASE_URL = "https://fopooatfcrfyixhxpalx.supabase.co";
const SUPABASE_KEY = "sb_publishable_Vh65ZTaTlVdZllrha5PmMg_qe9OxJPr";

export async function onRequest({ request, env, next }) {
  const json = (obj, status) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });

  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return json({ ok: false, error: "Sesión requerida." }, 401);
  }

  try {
    const resp = await fetch((env.SUPABASE_URL || SUPABASE_URL) + "/auth/v1/user", {
      headers: {
        apikey: env.SUPABASE_KEY || SUPABASE_KEY,
        Authorization: "Bearer " + token
      },
      signal: AbortSignal.timeout(8000)
    });

    if (resp.status >= 400 && resp.status < 500) {
      return json({ ok: false, error: "Sesión no válida o caducada." }, 401);
    }
    if (!resp.ok) {
      return json({ ok: false, error: "No se pudo verificar la sesión." }, 502);
    }
  } catch {
    return json({ ok: false, error: "No se pudo verificar la sesión." }, 502);
  }

  return next();
}
