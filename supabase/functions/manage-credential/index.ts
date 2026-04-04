import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.85.0';
import { encode as base64Encode, decode as base64Decode } from 'https://deno.land/std@0.208.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Funções de criptografia AES-256-GCM
async function getKey(secret: string): Promise<CryptoKey> {
  const keyData = base64Decode(secret);
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(plaintext: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const encoded = new TextEncoder().encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  
  // Concatenar IV + ciphertext e converter para base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return base64Encode(combined);
}

async function decrypt(encryptedData: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const combined = base64Decode(encryptedData);
  
  // Extrair IV (primeiros 12 bytes) e ciphertext
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY not configured');
    }

    const body = await req.json();
    const { action, provider, credential_type, label, value, credential_id, metadata } = body;

    console.log(`[manage-credential] Action: ${action}, Provider: ${provider}`);

    // Ação: Criar/atualizar credencial
    if (action === 'save') {
      if (!provider || !credential_type || !value) {
        return new Response(
          JSON.stringify({ success: false, error: 'provider, credential_type e value são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Criptografar o valor
      const encryptedValue = await encrypt(value, encryptionKey);

      // Verificar se já existe credencial para este provider/type
      const { data: existing } = await supabase
        .from('api_credentials')
        .select('id')
        .eq('provider', provider)
        .eq('credential_type', credential_type)
        .single();

      let result;
      if (existing) {
        // Atualizar existente
        result = await supabase
          .from('api_credentials')
          .update({
            value_encrypted: encryptedValue,
            label: label || `${provider} - ${credential_type}`,
            metadata: metadata || {},
            is_valid: true,
            validation_error: null,
            last_validated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        // Criar nova
        result = await supabase
          .from('api_credentials')
          .insert({
            provider,
            credential_type,
            value_encrypted: encryptedValue,
            label: label || `${provider} - ${credential_type}`,
            metadata: metadata || {},
            is_valid: true,
          })
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      console.log(`[manage-credential] Saved credential for ${provider}/${credential_type}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          credential: {
            id: result.data.id,
            provider: result.data.provider,
            credential_type: result.data.credential_type,
            label: result.data.label,
            is_valid: result.data.is_valid,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ação: Buscar credencial (descriptografada)
    if (action === 'get') {
      if (!provider || !credential_type) {
        return new Response(
          JSON.stringify({ success: false, error: 'provider e credential_type são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: cred, error } = await supabase
        .from('api_credentials')
        .select('*')
        .eq('provider', provider)
        .eq('credential_type', credential_type)
        .single();

      if (error || !cred) {
        return new Response(
          JSON.stringify({ success: false, error: 'Credencial não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Descriptografar
      let decryptedValue;
      try {
        decryptedValue = await decrypt(cred.value_encrypted, encryptionKey);
      } catch (e) {
        // Se falhar, pode ser que a credencial foi salva antes da criptografia
        decryptedValue = cred.value_encrypted;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          credential: {
            ...cred,
            value: decryptedValue,
            value_encrypted: undefined, // Não retornar o valor criptografado
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ação: Deletar credencial
    if (action === 'delete') {
      if (!credential_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'credential_id é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('api_credentials')
        .delete()
        .eq('id', credential_id);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação inválida. Use: save, get, delete' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[manage-credential] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
