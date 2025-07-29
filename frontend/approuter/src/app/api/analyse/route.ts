// src/app/api/analyse/route.ts
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const fastapiResp = await fetch('http://localhost:8000/analyse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const json = await fastapiResp.json()
  return new Response(JSON.stringify(json), {
    status: fastapiResp.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
