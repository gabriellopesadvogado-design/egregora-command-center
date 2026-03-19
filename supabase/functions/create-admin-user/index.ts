import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email, password, nome, cargo } = await req.json();

    if (!email || !password || !nome) {
      return new Response(
        JSON.stringify({ success: false, error: "Email, password and nome are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    });

    if (authError) throw new Error(`Auth error: ${authError.message}`);

    const userId = authData.user?.id;
    if (!userId) throw new Error("Failed to get user ID");

    // Insert into core_users
    const { error: insertError } = await supabase
      .from("core_users")
      .upsert({
        id: userId,
        email,
        nome,
        cargo: cargo || "admin",
        ativo: true,
      }, { onConflict: "id" });

    if (insertError) {
      console.error("core_users insert error:", insertError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "User created", userId, email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
