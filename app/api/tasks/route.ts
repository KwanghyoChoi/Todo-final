import { NextResponse } from "next/server"
import { createSupabaseClient, hasSupabaseConfig } from "@/lib/supabase"

const hermesApiToken = process.env.HERMES_API_TOKEN

function assertAuth(request: Request) {
  if (!hermesApiToken) return true

  const bearer = request.headers.get("authorization")
  const token = request.headers.get("x-hermes-token")
  const provided = bearer?.startsWith("Bearer ") ? bearer.slice(7).trim() : token

  return provided === hermesApiToken
}

function getSupabaseClient() {
  if (!hasSupabaseConfig) {
    return null
  }

  return createSupabaseClient()
}

export async function GET(request: Request) {
  if (!assertAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const completed = searchParams.get("completed")

  let query = supabase.from("todos").select("*").order("created_at", { ascending: false })

  if (completed === "true") {
    query = query.eq("completed", true)
  } else if (completed === "false") {
    query = query.eq("completed", false)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  if (!assertAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const text = typeof body.text === "string" ? body.text.trim() : ""
  const date = typeof body.date === "string" && body.date.length > 0 ? body.date : null
  const important = Boolean(body.important)

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("todos")
    .insert({ text, date, important, completed: false })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data?.[0] ?? null }, { status: 201 })
}

export async function PATCH(request: Request) {
  if (!assertAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const id = typeof body.id === "string" ? body.id.trim() : ""
  const updates = body.updates && typeof body.updates === "object" ? body.updates : null

  if (!id || !updates) {
    return NextResponse.json({ error: "id and updates are required" }, { status: 400 })
  }

  const { data, error } = await supabase.from("todos").update(updates).eq("id", id).select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data?.[0] ?? null })
}

export async function DELETE(request: Request) {
  if (!assertAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const id = typeof body.id === "string" ? body.id.trim() : ""

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const { error } = await supabase.from("todos").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
