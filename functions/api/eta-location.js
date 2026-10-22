// Cloudflare Pages Function: functions/api/eta-location.js
// Uses the same ORS_API_KEY secret as eta-route.js.
export async function onRequestPost({request,env}) {
  const json=(obj,status=200)=>new Response(JSON.stringify(obj),{
    status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
  });
  if(!env.ORS_API_KEY)return json({error:'Falta ORS_API_KEY'},503);
  let body;
  try {
    if(Number(request.headers.get('content-length')||0)>2048)return json({error:'Solicitud demasiado grande'},413);
    body=await request.json();
  }catch{return json({error:'Solicitud inválida'},400)}
  const p=body?.origin;
  if(!p||typeof p.lat!=='number'||typeof p.lon!=='number'||
     !Number.isFinite(p.lat)||!Number.isFinite(p.lon)||
     Math.abs(p.lat)>90||Math.abs(p.lon)>180)
    return json({error:'Coordenadas inválidas'},400);
  const url=new URL('https://api.openrouteservice.org/geocode/reverse');
  url.searchParams.set('point.lat',String(p.lat));
  url.searchParams.set('point.lon',String(p.lon));
  url.searchParams.set('size','1');
  try {
    const response=await fetch(url,{
      headers:{'Authorization':env.ORS_API_KEY,'Accept':'application/json'},
      signal:AbortSignal.timeout(12000)
    });
    if(!response.ok)return json({error:'No se pudo identificar la dirección'},502);
    const data=await response.json();
    const props=data?.features?.[0]?.properties;
    if(!props)return json({error:'No hay dirección para estas coordenadas'},404);
    const address=props.label||
      [props.name,props.street,props.locality||props.city,props.region,props.country]
        .filter(Boolean).join(', ');
    if(!address)return json({error:'No hay dirección para estas coordenadas'},404);
    return json({location:address});
  }catch{return json({error:'Servicio de ubicación no disponible'},502)}
}
