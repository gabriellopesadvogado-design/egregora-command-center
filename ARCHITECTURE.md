# Arquitetura do Sistema

## Diagrama de Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ENTRADA DE LEADS                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
   ┌─────────┐               ┌─────────────┐             ┌──────────┐
   │ HubSpot │               │  Meta Ads   │             │  Manual  │
   │  Forms  │               │  (futuro)   │             │  Import  │
   └────┬────┘               └──────┬──────┘             └────┬─────┘
        │                           │                          │
        └───────────────────────────┼──────────────────────────┘
                                    ▼
                    ┌───────────────────────────────┐
                    │     /hubspot-webhook          │
                    │   (Edge Function Supabase)    │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │   Verifica test_phone_numbers │
                    │   (modo teste ativo)          │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │   lead_automation_queue       │
                    │   status: 'waiting'           │
                    │   wait_until: +5 minutos      │
                    └───────────────┬───────────────┘
                                    │
                                    │ (cron: cada minuto)
                                    ▼
                    ┌───────────────────────────────┐
                    │   /process-lead-queue         │
                    │   (Edge Function)             │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │   Lead respondeu?             │
                    └───────────────┬───────────────┘
                           │                │
                          SIM              NÃO
                           │                │
                           ▼                ▼
              ┌─────────────────┐  ┌─────────────────────┐
              │ status:         │  │ Envia Template      │
              │ 'qualifying'    │  │ (API Oficial Meta)  │
              └────────┬────────┘  └──────────┬──────────┘
                       │                      │
                       │              ┌───────▼───────┐
                       │              │ Template OK?  │
                       │              └───────┬───────┘
                       │                 │         │
                       │                SIM       NÃO
                       │                 │         │
                       │                 ▼         ▼
                       │    ┌──────────────┐ ┌──────────────┐
                       │    │ status:      │ │ Fallback:    │
                       │    │ 'waiting_    │ │ Z-API SDR    │
                       │    │  response'   │ └──────┬───────┘
                       │    └──────────────┘        │
                       │                            ▼
                       │              ┌─────────────────────┐
                       │              │ status:             │
                       │              │ 'fallback_sdr'      │
                       │              └─────────────────────┘
                       │
                       ▼
          ┌─────────────────────────┐
          │   Nina (IA Qualificação)│
          │   (implementação futura)│
          └─────────────────────────┘
```

## Fluxo de Mensagens WhatsApp

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RECEBIMENTO (Inbound)                       │
└─────────────────────────────────────────────────────────────────────┘

   ┌─────────────┐
   │   Z-API     │ ──webhook──▶ /zapi-webhook ──▶ whatsapp_messages
   │  (SDRs)     │                    │
   └─────────────┘                    ▼
                              whatsapp_conversations
                                      │
                                      ▼
                              Atualiza last_message_at
                              Notifica frontend (realtime)


┌─────────────────────────────────────────────────────────────────────┐
│                           ENVIO (Outbound)                          │
└─────────────────────────────────────────────────────────────────────┘

   Frontend (Chat)
        │
        ▼
   /send-zapi-message ──▶ Z-API ──▶ WhatsApp do Lead
        │
        ▼
   whatsapp_messages (status: 'sent')
        │
        ▼
   Webhook Z-API confirma entrega (status: 'delivered'/'read')
```

## Estrutura de Instâncias

```
┌─────────────────────────────────────────────────────────────────────┐
│                      INSTÂNCIAS WHATSAPP                            │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ API OFICIAL (Meta)                                                │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ Número: 61 9571-0622 (Egrégora)                             │   │
│ │ Uso: Templates, Primeiro contato, Qualificação Nina         │   │
│ │ Provider: graph.facebook.com                                │   │
│ └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ API NÃO-OFICIAL (Z-API)                                           │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ SDR Hugo: 61 99310-5477                                     │   │
│ │ SDR Júnior: (pendente)                                      │   │
│ │ Uso: Fallback, Atendimento humanizado, Follow-up            │   │
│ │ Provider: api.z-api.io                                      │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ Closer Victor: (futuro)                                     │   │
│ │ Closer Larissa: (futuro)                                    │   │
│ │ Uso: Pós-qualificação, Fechamento                           │   │
│ └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

## Banco de Dados (Principais Tabelas)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          SUPABASE                                   │
└─────────────────────────────────────────────────────────────────────┘

CORE:
├── core_users                 # Usuários do sistema
├── api_credentials            # Credenciais de APIs

WHATSAPP:
├── whatsapp_instances         # Instâncias (Z-API, Meta)
├── whatsapp_contacts          # Contatos/Leads
├── whatsapp_conversations     # Conversas
├── whatsapp_messages          # Mensagens
└── whatsapp_templates         # Templates Meta

AUTOMAÇÃO:
├── lead_automation_queue      # Fila de leads
├── lead_automation_log        # Log de ações
└── test_phone_numbers         # Números de teste

FUTURO:
├── ad_accounts                # Contas de anúncios
├── conversions_events         # Eventos de conversão
└── landing_pages              # Landing pages
```

## Segurança

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CAMADAS DE SEGURANÇA                        │
└─────────────────────────────────────────────────────────────────────┘

1. Row Level Security (RLS)
   - Todas as tabelas têm RLS habilitado
   - Políticas baseadas em auth.uid()

2. Edge Functions
   - --no-verify-jwt para webhooks externos
   - Service Role Key para operações internas

3. Credenciais
   - Armazenadas no 1Password
   - Nunca em código ou variáveis de ambiente expostas

4. Modo Teste
   - test_phone_numbers controla quais números são processados
   - Produção só ativa removendo verificação de teste
```

## Deploy Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DEPLOY PIPELINE                             │
└─────────────────────────────────────────────────────────────────────┘

FRONTEND:
   git push origin main
         │
         ▼
   Vercel (auto-deploy)
         │
         ▼
   egregora-command-center.vercel.app


EDGE FUNCTIONS:
   supabase functions deploy <nome> --project-ref zxwkjogjbyywufertkor
         │
         ▼
   Supabase Edge Functions
         │
         ▼
   https://zxwkjogjbyywufertkor.supabase.co/functions/v1/<nome>


DATABASE:
   SQL Editor no Supabase Dashboard
   ou
   supabase db push (com migrations)
```
