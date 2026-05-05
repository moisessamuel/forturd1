import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

async function updateAdminPassword() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: Variables de entorno de Supabase no configuradas");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log("🔐 Actualizando contraseña del administrador Williamsgamundi...");

    const username = "Williamsgamundi";
    const newPassword = "gamundistrateg";

    // Hash the new password
    const hash = await bcrypt.hash(newPassword, 10);

    // Update the admin user
    const { data, error } = await supabase
      .from("admin_users")
      .update({ password_hash: hash })
      .eq("username", username)
      .select();

    if (error) {
      console.error("❌ Error actualizando contraseña:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.error("❌ Error: Usuario no encontrado");
      process.exit(1);
    }

    console.log("✅ Contraseña actualizada exitosamente");
    console.log(`📝 Usuario: ${username}`);
    console.log(`🔑 Nueva contraseña: ${newPassword}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log("\n⚠️  La contraseña anterior (Gamundiiw1) ya NO es válida");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

updateAdminPassword();
