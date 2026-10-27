
export async function onRequestGet({ env }) {
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });

  if (!env.WIALON_TOKEN) {
    return json({ ok: false, error: "Falta WIALON_TOKEN" }, 500);
  }

  try {
    const params = new URLSearchParams({
      svc: "token/login",
      params: JSON.stringify({ token: env.WIALON_TOKEN })
    });

    const response = await fetch(
      "https://hst-api.wialon.com/wialon/ajax.html",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params,
        signal: AbortSignal.timeout(12000)
      }
    );

    const data = await response.json();

    if (!response.ok || data.error || !data.eid) {
      return json({
        ok: false,
        conexion: "rechazada",
        codigoWialon: data.error ?? null
      }, 502);
    }

    const sid = data.eid;

    try {
      const searchParams = new URLSearchParams({
        svc: "core/search_items",
        params: JSON.stringify({
          spec: {
            itemsType: "avl_unit",
            propName: "sys_name",
            propValueMask: "*",
            sortType: "sys_name"
          },
          force: 1,
          flags: 1025,
          from: 0,
          to: 100
        }),
        sid
      });

      const unitsResponse = await fetch(
        "https://hst-api.wialon.com/wialon/ajax.html",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: searchParams,
          signal: AbortSignal.timeout(12000)
        }
      );

      const result = await unitsResponse.json();

      if (!unitsResponse.ok || result.error) {
        return json({
          ok: false,
          conexion: "aceptada",
          consultaUnidades: "fallida",
          codigoWialon: result.error ?? null
        }, 502);
      }

      const units = result.items ?? [];

      return json({
        ok: true,
        conexion: "aceptada",
        totalUnidades: result.totalItems ?? units.length,
        unidades: units.map(unit => ({
          id: unit.id ?? null,
          nombre: unit.nm ?? null,,
          tieneGPS: Boolean(unit.pos),
          ultimaActualizacion: unit.pos?.t ?? null,
          latitud: unit.pos?.y != null &&
            Number.isFinite(Number(unit.pos.y))
              ? Number(unit.pos.y) : null,
          longitud: unit.pos?.x != null &&
            Number.isFinite(Number(unit.pos.x))
              ? Number(unit.pos.x) : null,
          velocidadKmh: unit.pos?.s != null &&
            Number.isFinite(Number(unit.pos.s))
              ? Number(unit.pos.s) : null
        }))
      });
    } finally {
      const logoutParams = new URLSearchParams({
        svc: "core/logout",
        params: "{}",
        sid
      });

      await fetch("https://hst-api.wialon.com/wialon/ajax.html", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: logoutParams,
        signal: AbortSignal.timeout(5000)
      }).catch(() => {});
    }
  } catch (error) {
    return json({
      ok: false,
      error: "No se pudo completar la conexión con Wialon"
    }, 502);
  }
}
