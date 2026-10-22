
 // Cloudflare Pages Function: functions/api/eta-route.js
 // La clave ORS_API_KEY se guarda como Secret en Cloudflare.

export async function onRequestPost({ request, env }) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });

  if (!env.ORS_API_KEY) {
    return json({
      error: "Falta configurar ORS_API_KEY en Cloudflare."
    }, 503);
  }

  let body;

  try {
    if (Number(request.headers.get("content-length") || 0) > 2048) {
      return json({ error: "Solicitud demasiado grande." }, 413);
    }

    body = await request.json();
  } catch {
    return json({ error: "Solicitud inválida." }, 400);
  }

  const valid = p =>
    p &&
    typeof p === "object" &&
    typeof p.lat === "number" &&
    typeof p.lon === "number" &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lon) <= 180;

  if (!valid(body?.origin) || !valid(body?.destination)) {
    return json({ error: "Coordenadas inválidas." }, 400);
  }

  try {
    const resp = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car/json",
      {
        method: "POST",
        headers: {
          "Authorization": env.ORS_API_KEY,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          coordinates: [
            [body.origin.lon, body.origin.lat],
            [body.destination.lon, body.destination.lat]
          ]
        }),
        signal: AbortSignal.timeout(20000)
      }
    );

    if (!resp.ok) {
      console.error("ORS HTTP status:", resp.status);

      if (resp.status === 401 || resp.status === 403) {
        return json({
          error: "OpenRouteService rechazó la clave API. Revisa ORS_API_KEY.",
          codigo: resp.status
        }, 502);
      }

      if (resp.status === 429) {
        return json({
          error: "Se alcanzó el límite de consultas de OpenRouteService.",
          codigo: 429
        }, 429);
      }

      if (resp.status === 404 || resp.status === 400) {
        return json({
          error: "OpenRouteService no encontró una ruta válida entre estos puntos.",
          codigo: resp.status
        }, 502);
      }

      return json({
        error: "OpenRouteService devolvió un error HTTP.",
        codigo: resp.status
      }, 502);
    }

    const result = await resp.json();
    const summary = result?.routes?.[0]?.summary;

    if (
      !Number.isFinite(summary?.distance) ||
      !Number.isFinite(summary?.duration)
    ) {
      return json({
        error: "OpenRouteService no devolvió distancia y duración válidas."
      }, 502);
    }

    return json({
      distanceMeters: summary.distance,
      durationSeconds: summary.duration
    });

  } catch (err) {
    console.error("Error de conexión ORS:", err?.name || "Unknown");

    return json({
      error: "No fue posible conectar con OpenRouteService."
    }, 502);
  }
}
