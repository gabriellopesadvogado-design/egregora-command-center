import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-bootstrap-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate bootstrap token for security
    const bootstrapToken = Deno.env.get("ADMIN_BOOTSTRAP_TOKEN");
    const providedToken = req.headers.get("x-bootstrap-token");

    if (!bootstrapToken || providedToken !== bootstrapToken) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid bootstrap token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, password, nome, action, user_id } = await req.json();

    // Action: reset password for existing user
    if (action === "reset_password" && user_id && password) {
      const { data, error } = await supabase.auth.admin.updateUserById(
        user_id,
        { password, email_confirm: true }
      );

      if (error) {
        throw new Error(`Reset password error: ${error.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Password reset successfully",
          user_id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Action: confirm email for existing user
    if (action === "confirm_email" && user_id) {
      const { data, error } = await supabase.auth.admin.updateUserById(
        user_id,
        { email_confirm: true }
      );

      if (error) {
        throw new Error(`Confirm email error: ${error.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email confirmed successfully",
          user_id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Action: create new admin user
    if (!email || !password || !nome) {
      return new Response(
        JSON.stringify({ success: false, error: "Email, password and nome are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create user with admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    });

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`);
    }

    const userId = authData.user?.id;
    if (!userId) {
      throw new Error("Failed to get user ID");
    }

    // Update profile role to admin
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // Update user_roles to admin
    const { error: roleError } = await supabase
      .from("user_roles")
      .update({ role: "admin" })
      .eq("user_id", userId);

    if (roleError) {
      console.error("Role update error:", roleError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin user created successfully",
        userId,
        email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error in admin operation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
