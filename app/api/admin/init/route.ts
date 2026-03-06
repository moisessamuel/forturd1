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
    
    // Hash the password
    const password = "pocoyo123";
    const hash = await bcrypt.hash(password, 10);
    
    // Check if admin already exists
    const { data: existing } = await supabase
      .from("admin_users")
      .select("id")
      .eq("username", "pocoyo")
      .single();
    
    if (existing) {
      // Update existing admin
      const { error } = await supabase
        .from("admin_users")
        .update({ password_hash: hash })
        .eq("username", "pocoyo");
      
      if (error) throw error;
      
      return NextResponse.json({ 
        success: true, 
        message: "Admin password updated",
        username: "pocoyo"
      });
    } else {
      // Create new admin
      const { error } = await supabase
        .from("admin_users")
        .insert({
          username: "pocoyo",
          password_hash: hash
        });
      
      if (error) throw error;
      
      return NextResponse.json({ 
        success: true, 
        message: "Admin user created",
        username: "pocoyo"
      });
    }
  } catch (error) {
    console.error("Error initializing admin:", error);
    return NextResponse.json(
      { error: "Error initializing admin user" },
      { status: 500 }
    );
  }
}
