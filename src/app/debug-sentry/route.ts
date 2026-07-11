import { NextResponse } from "next/server";

// TEMPORAL: dispara un error para verificar la captura en Sentry. Inerte en prod (404).
// Borrar tras confirmar el evento en Sentry.
export async function GET() {
  if (process.env.NEXT_PUBLIC_APP_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  throw new Error("sentry-test: verificacion de captura en QA (borrar tras confirmar)");
}
