import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.85.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthResult {
  component: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  status_message: string;
  latency_ms: number | null;
  success_rate: number | null;
  last_error: string | null;
}

async function checkWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<{ data: T | null; latency: number; error: string | null }> {
  const start = Date.now();
  try {
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      ),
    ]);
    return { data: result, latency: Date.now() - start, error: null };
  } catch (err: any) {
    return { data: null, latency: Date.now() - start, error: err.message || 'Unknown error' };
  }
}

async function checkSupabase(supabase: any): Promise<HealthResult> {
  const { latency, error } = await checkWithTimeout(
    supabase.from('whatsapp_instances').select('id').limit(1),
    5000
  );
  
  return {
    component: 'supabase',
    status: error ? 'down' : 'healthy',
    status_message: error ? `Erro: ${error}` : 'Conectado',
    latency_ms: latency,
    success_rate: error ? 0 : 100,
    last_error: error,
  };
}

async function checkZAPI(supabase: any): Promise<HealthResult> {
  // Buscar instâncias Z-API ativas
  const { data: instances } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('provider', 'zapi')
    .eq('is_active', true);

  if (!instances || instances.length === 0) {
    return {
      component: 'zapi',
      status: 'unknown',
      status_message: 'Nenhuma instância configurada',
      latency_ms: null,
      success_rate: null,
      last_error: null,
    };
  }

  // Testar cada instância
  let healthyCount = 0;
  let totalLatency = 0;
  let lastError: string | null = null;

  for (const inst of instances) {
    if (!inst.zapi_instance_id || !inst.zapi_token) continue;

    const url = `https://api.z-api.io/instances/${inst.zapi_instance_id}/token/${inst.zapi_token}/status`;
    const { data, latency, error } = await checkWithTimeout(
      fetch(url, {
        headers: { 'Client-Token': inst.zapi_client_token || '' },
      }).then(r => r.json()),
      10000
    );

    totalLatency += latency;

    if (error) {
      lastError = `${inst.nome}: ${error}`;
    } else if (data?.connected === true) {
      healthyCount++;
      // Atualizar is_connected no banco
      await supabase
        .from('whatsapp_instances')
        .update({ is_connected: true })
        .eq('id', inst.id);
    } else {
      lastError = `${inst.nome}: Desconectado`;
      await supabase
        .from('whatsapp_instances')
        .update({ is_connected: false })
        .eq('id', inst.id);
    }
  }

  const configuredCount = instances.filter((i: any) => i.zapi_instance_id).length;
  const successRate = configuredCount > 0 ? Math.round((healthyCount / configuredCount) * 100) : 0;

  return {
    component: 'zapi',
    status: healthyCount === configuredCount ? 'healthy' : healthyCount > 0 ? 'degraded' : 'down',
    status_message: `${healthyCount}/${configuredCount} instâncias conectadas`,
    latency_ms: configuredCount > 0 ? Math.round(totalLatency / configuredCount) : null,
    success_rate: successRate,
    last_error: lastError,
  };
}

async function checkMetaWhatsApp(supabase: any): Promise<HealthResult> {
  // Buscar credenciais Meta
  const { data: cred } = await supabase
    .from('api_credentials')
    .select('*')
    .eq('provider', 'meta')
    .eq('credential_type', 'access_token')
    .eq('is_valid', true)
    .single();

  if (!cred) {
    return {
      component: 'whatsapp_oficial',
      status: 'unknown',
      status_message: 'Não configurado',
      latency_ms: null,
      success_rate: null,
      last_error: null,
    };
  }

  const phoneNumberId = cred.metadata?.phone_number_id;
  if (!phoneNumberId) {
    return {
      component: 'whatsapp_oficial',
      status: 'degraded',
      status_message: 'Phone Number ID não configurado',
      latency_ms: null,
      success_rate: null,
      last_error: 'Missing phone_number_id',
    };
  }

  // Testar API Meta - verificar status do número
  const url = `https://graph.facebook.com/v22.0/${phoneNumberId}?fields=verified_name,quality_rating&access_token=${cred.value_encrypted}`;
  const { data, latency, error } = await checkWithTimeout(
    fetch(url).then(r => r.json()),
    10000
  );

  if (error) {
    return {
      component: 'whatsapp_oficial',
      status: 'down',
      status_message: `Erro: ${error}`,
      latency_ms: latency,
      success_rate: 0,
      last_error: error,
    };
  }

  if (data?.error) {
    // Marcar credencial como inválida
    await supabase
      .from('api_credentials')
      .update({ is_valid: false, validation_error: data.error.message })
      .eq('id', cred.id);

    return {
      component: 'whatsapp_oficial',
      status: 'down',
      status_message: `API Error: ${data.error.message}`,
      latency_ms: latency,
      success_rate: 0,
      last_error: data.error.message,
    };
  }

  // Atualizar instância Meta como conectada
  await supabase
    .from('whatsapp_instances')
    .update({ is_connected: true })
    .eq('provider', 'meta');

  return {
    component: 'whatsapp_oficial',
    status: 'healthy',
    status_message: `Conectado (${data.verified_name || 'Verificado'})`,
    latency_ms: latency,
    success_rate: 100,
    last_error: null,
  };
}

async function checkOpenAI(supabase: any): Promise<HealthResult> {
  const { data: cred } = await supabase
    .from('api_credentials')
    .select('*')
    .eq('provider', 'openai')
    .eq('credential_type', 'api_key')
    .eq('is_valid', true)
    .single();

  if (!cred) {
    return {
      component: 'openai',
      status: 'unknown',
      status_message: 'Não configurado',
      latency_ms: null,
      success_rate: null,
      last_error: null,
    };
  }

  // Testar API OpenAI - listar modelos
  const { data, latency, error } = await checkWithTimeout(
    fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${cred.value_encrypted}` },
    }).then(r => r.json()),
    10000
  );

  if (error) {
    return {
      component: 'openai',
      status: 'down',
      status_message: `Erro: ${error}`,
      latency_ms: latency,
      success_rate: 0,
      last_error: error,
    };
  }

  if (data?.error) {
    await supabase
      .from('api_credentials')
      .update({ is_valid: false, validation_error: data.error.message })
      .eq('id', cred.id);

    return {
      component: 'openai',
      status: 'down',
      status_message: `API Error: ${data.error.message}`,
      latency_ms: latency,
      success_rate: 0,
      last_error: data.error.message,
    };
  }

  return {
    component: 'openai',
    status: 'healthy',
    status_message: 'API Key válida',
    latency_ms: latency,
    success_rate: 100,
    last_error: null,
  };
}

async function checkHubSpot(supabase: any): Promise<HealthResult> {
  const { data: cred } = await supabase
    .from('api_credentials')
    .select('*')
    .eq('provider', 'hubspot')
    .eq('is_valid', true)
    .single();

  if (!cred) {
    return {
      component: 'hubspot',
      status: 'unknown',
      status_message: 'Não configurado',
      latency_ms: null,
      success_rate: null,
      last_error: null,
    };
  }

  // Testar API HubSpot - verificar token
  const { data, latency, error } = await checkWithTimeout(
    fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
      headers: { 'Authorization': `Bearer ${cred.value_encrypted}` },
    }).then(r => r.json()),
    10000
  );

  if (error) {
    return {
      component: 'hubspot',
      status: 'down',
      status_message: `Erro: ${error}`,
      latency_ms: latency,
      success_rate: 0,
      last_error: error,
    };
  }

  if (data?.status === 'error' || data?.message) {
    return {
      component: 'hubspot',
      status: 'down',
      status_message: `API Error: ${data.message || 'Token inválido'}`,
      latency_ms: latency,
      success_rate: 0,
      last_error: data.message,
    };
  }

  return {
    component: 'hubspot',
    status: 'healthy',
    status_message: 'Conectado',
    latency_ms: latency,
    success_rate: 100,
    last_error: null,
  };
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

    console.log('[health-check] Starting health checks...');

    // Executar todas as verificações em paralelo
    const results = await Promise.all([
      checkSupabase(supabase),
      checkZAPI(supabase),
      checkMetaWhatsApp(supabase),
      checkOpenAI(supabase),
      checkHubSpot(supabase),
    ]);

    const now = new Date().toISOString();

    // Salvar resultados na tabela system_health
    for (const result of results) {
      const { error } = await supabase
        .from('system_health')
        .upsert({
          component: result.component,
          status: result.status,
          status_message: result.status_message,
          latency_ms: result.latency_ms,
          success_rate: result.success_rate,
          last_error: result.last_error,
          last_error_at: result.last_error ? now : null,
          last_check_at: now,
        }, {
          onConflict: 'component',
        });

      if (error) {
        console.error(`[health-check] Error saving ${result.component}:`, error);
      }
    }

    // Criar alertas para componentes com problemas
    const downComponents = results.filter(r => r.status === 'down');
    for (const comp of downComponents) {
      // Verificar se já existe alerta não resolvido para este componente
      const { data: existingAlert } = await supabase
        .from('system_alerts')
        .select('id')
        .eq('component', comp.component)
        .eq('is_resolved', false)
        .single();

      if (!existingAlert) {
        await supabase.from('system_alerts').insert({
          severity: 'error',
          category: 'integration',
          title: `${comp.component} está offline`,
          message: comp.status_message,
          component: comp.component,
          details: { last_error: comp.last_error },
          suggested_action: 'Verifique as credenciais e a conectividade da API',
        });
      }
    }

    console.log('[health-check] Health checks completed:', results.map(r => `${r.component}:${r.status}`).join(', '));

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[health-check] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
