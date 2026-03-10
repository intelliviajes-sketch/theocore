export async function GET() {
  return Response.json(
    {
      error: "Endpoint de debug deshabilitado para produccion.",
    },
    { status: 501 },
  );
}
