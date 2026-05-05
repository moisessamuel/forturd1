import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

// This endpoint initializes the admin user with a proper bcrypt hash
// Should only be called once during setup
export async function GET() {
  return handleInit();
}

export async function POST() {
  return handleInit();
}

async function handleInit() {
  try {
    const supabase = await createClient();
    
    // Update password for Williamsgamundi
    const username = "Williamsgamundi";
    const newPassword = "gamundistrateg";
    const hash = await bcrypt.hash(newPassword, 10);
    
    // Update admin user password
    const { error: updateError, data: updateData } = await supabase
      .from("admin_users")
      .update({ password_hash: hash })
      .eq("username", username)
      .select();
    
    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: "Error actualizando contraseña", details: updateError.message },
        { status: 500 }
      );
    }
    
    if (!updateData || updateData.length === 0) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Contraseña actualizada exitosamente",
      username: username,
      passwordUpdated: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating admin password:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
