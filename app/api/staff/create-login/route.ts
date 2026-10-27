import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !serviceKey || !token) return NextResponse.json({ error: "Staff login creation is not configured." }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: callerData, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !callerData.user) return NextResponse.json({ error: "Your session has expired." }, { status: 401 });
  const { data: caller } = await admin.from("staff").select("role").eq("auth_user_id", callerData.user.id).maybeSingle();
  if (caller?.role !== "admin") return NextResponse.json({ error: "Only an administrator can create staff logins." }, { status: 403 });

  const body = await request.json() as { staffId?: string; password?: string };
  if (!body.staffId || !body.password || body.password.length < 8) return NextResponse.json({ error: "Use a temporary password of at least 8 characters." }, { status: 400 });
  const { data: staff, error: staffError } = await admin.from("staff").select("id,email,auth_user_id,is_active").eq("id", body.staffId).maybeSingle();
  if (staffError || !staff || !staff.is_active) return NextResponse.json({ error: "Active staff record not found." }, { status: 404 });
  if (staff.auth_user_id) return NextResponse.json({ error: "This staff member already has a login." }, { status: 409 });

  const { data: created, error: createError } = await admin.auth.admin.createUser({ email: staff.email, password: body.password, email_confirm: true });
  if (createError || !created.user) return NextResponse.json({ error: createError?.message || "Unable to create login." }, { status: 400 });
  const { error: linkError } = await admin.from("staff").update({ auth_user_id: created.user.id }).eq("id", staff.id);
  if (linkError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "Unable to link the staff login." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
