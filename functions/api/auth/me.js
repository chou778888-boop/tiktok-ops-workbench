export function onRequestGet({ data }) {
  return new Response(JSON.stringify({ user: data.user }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
