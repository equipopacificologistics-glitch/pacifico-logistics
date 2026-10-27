export async function onRequestGet({ env }) {
  return new Response(
    JSON.stringify({
      ok: true,
      mensaje: "La función de Wialon está funcionando",
      tokenConfigurado: Boolean(env.WIALON_TOKEN)
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    }
  );
}
