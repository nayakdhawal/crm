import { NextResponse } from "next/server";
import { requireWorkspace } from "@/lib/supabase/server";
import { validateService } from "@/lib/serviceValidation";

export async function PATCH(request, props) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { id } = await props.params;
  const { value, error: validationError } = validateService(await request.json());
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const { data, error } = await ctx.supabase
    .from("services_master")
    .update(value)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data });
}

export async function DELETE(request, props) {
  const ctx = await requireWorkspace();
  if (ctx.error) return ctx.error;

  const { id } = await props.params;
  const { error } = await ctx.supabase.from("services_master").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "This service is used by a lead or estimate, so it can't be deleted. Edit its rate instead." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
