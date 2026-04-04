# Egrégora Command Center — Documentação Técnica Completa

> **Última atualização:** 2026-04-04
> **Responsável:** Hera (IA Sócia Tecnológica)
> **Projeto:** Plataforma de gestão comercial da Egrégora Migration

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estrutura do Banco de Dados](#3-estrutura-do-banco-de-dados)
4. [Integrações Externas](#4-integrações-externas)
5. [Fluxos Automatizados](#5-fluxos-automatizados)
6. [Edge Functions (Supabase)](#6-edge-functions-supabase)
7. [Cron Jobs](#7-cron-jobs)
8. [Páginas do Sistema](#8-páginas-do-sistema)
9. [Status Atual](#9-status-atual)
10. [Pendências e Próximos Passos](#10-pendências-e-próximos-passos)
11. [Credenciais e Acessos](#11-credenciais-e-acessos)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Visão Geral

O **Egrégora Command Center** é a plataforma centralizada de gestão comercial da Egrégora Migration, uma consultoria de naturalização brasileira e autorizações de residência.

### Objetivos da Plataforma:
- Centralizar dados de leads, vendas e campanhas
- Automatizar primeiro contato com leads
- Atribuir performance de campanhas (Meta Ads, Google Ads)
- Integrar WhatsApp (API Oficial + Z-API) para comunicação
- Fornecer dashboards de acompanhamento para gestão

### Principais Funcionalidades:
- **CRM**: Gestão de leads, pipeline, reuniões, propostas
- **Atribuição**: Rastrear qual campanha gerou cada venda
- **WhatsApp**: Chat integrado com API Oficial e Z-API
- **Reativação**: Identificar leads qualificados para reabordagem
- **Gestor IA**: Chat com IA para consultar dados do banco
- **Primeiro Contato Automático**: Envio automático de mensagem para novos leads

---

## 2. Stack Tecnológico

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Roteamento**: React Router DOM
- **Estado**: TanStack Query (React Query)
- **Hospedagem**: Lovable Cloud

### Backend
- **Banco de Dados**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Edge Functions**: Deno (Supabase Functions)
- **Cron Jobs**: pg_cron (Supabase)
- **Armazenamento**: Supabase Storage

### Integrações
- **CRM**: HubSpot (API v3)
- **Ads**: Meta Ads API (Graph API v21.0)
- **WhatsApp Oficial**: Meta Business API
- **WhatsApp Não-Oficial**: Z-API
- **IA**: OpenAI GPT-4o-mini
- **Credenciais**: 1Password CLI

### Repositório
- **GitHub**: `gabriellopesadvogado-design/egregora-command-center`
- **Branch principal**: `main`

---

## 3. Estrutura do Banco de Dados

### Projeto Supabase
- **Project Ref**: `zxwkjogjbyywufertkor`
- **URL**: `https://zxwkjogjbyywufertkor.supabase.co`

### Tabelas Principais

#### `crm_leads`
Armazena todos os leads da empresa.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| nome | TEXT | Nome completo |
| telefone | TEXT | Telefone normalizado (5511999999999) |
| whatsapp | TEXT | WhatsApp (mesmo formato) |
| email | TEXT | Email |
| campanha | TEXT | Nome real da campanha (ex: "[Y][Leads] - Leadads") |
| canal | TEXT | Canal de origem (Meta_Ads, Google_Ads, etc) |
| utm_source | TEXT | UTM source do HubSpot |
| utm_medium | TEXT | UTM medium |
| utm_campaign | TEXT | UTM campaign |
| utm_content | TEXT | UTM content |
| hubspot_contact_id | TEXT | ID do contato no HubSpot |
| hubspot_owner_id | TEXT | ID do owner (SDR) no HubSpot |
| pais_nascimento | TEXT | País de nascimento |
| nacionalidade | TEXT | Nacionalidade |
| tempo_residencia_brasil_anos | INT | Anos no Brasil |
| rnm_classificacao | TEXT | Tipo de RNM (indeterminado, temporário, etc) |
| rnm_data_vencimento | DATE | Vencimento do RNM |
| servico_interesse | TEXT | Serviço de interesse |
| casado_conjuge_brasileiro | BOOL | Casado com brasileiro |
| possui_filhos_brasileiros | BOOL | Tem filhos brasileiros |
| possui_pais_brasileiros | BOOL | Tem pais brasileiros |
| pais_lingua_portuguesa | BOOL | País de língua portuguesa |
| possui_certificado_portugues | BOOL | Tem Celpe-Bras |
| score_qualificacao | INT | Score 0-100 (calculado por trigger) |
| created_at | TIMESTAMP | Data de criação |

#### `crm_meetings`
Reuniões e status do pipeline.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| lead_id | UUID | FK → crm_leads |
| closer_id | UUID | FK → users |
| status | TEXT | Status do pipeline |
| avaliacao_reuniao | TEXT | "boa", "neutra", "ruim" |
| valor_proposta | DECIMAL | Valor da proposta |
| data_reuniao | TIMESTAMP | Data da reunião |
| data_proposta | TIMESTAMP | Data do envio da proposta |
| data_fechamento | TIMESTAMP | Data do fechamento |

#### `whatsapp_contacts`
Contatos do WhatsApp que interagiram.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| phone_number | TEXT | Número do contato |
| name | TEXT | Nome do contato |
| lead_id | UUID | FK → crm_leads (vinculado automaticamente) |
| last_message_at | TIMESTAMP | Última mensagem |

#### `whatsapp_messages`
Mensagens do WhatsApp.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| contact_id | UUID | FK → whatsapp_contacts |
| phone_number | TEXT | Número |
| direction | TEXT | "incoming" ou "outgoing" |
| content | TEXT | Conteúdo da mensagem |
| message_type | TEXT | "text", "audio", "image", etc |
| provider | TEXT | "meta" ou "zapi" |
| created_at | TIMESTAMP | Data/hora |

#### `whatsapp_instances`
Instâncias de WhatsApp (API Oficial e Z-API).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| nome | TEXT | Nome da instância |
| tipo | TEXT | "recepcao", "sdr", "closer" |
| api_type | TEXT | "oficial" ou "nao_oficial" |
| provider | TEXT | "meta" ou "zapi" |
| phone_number | TEXT | Número |
| hubspot_owner_id | TEXT | Mapeamento para SDR do HubSpot |
| zapi_instance_id | TEXT | ID da instância Z-API |
| zapi_token | TEXT | Token Z-API |
| zapi_client_token | TEXT | Client Token Z-API |
| is_connected | BOOL | Status de conexão |

#### `whatsapp_templates`
Templates aprovados do WhatsApp Business.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| name | TEXT | Nome amigável |
| template_id | TEXT | ID no Meta (ex: "primeiro_contato") |
| language | TEXT | Idioma (pt_BR) |
| body | TEXT | Corpo da mensagem |
| variables | JSONB | Variáveis do template |
| status | TEXT | "approved", "pending", "rejected" |

#### `lead_first_contact`
Fila de primeiro contato automático.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| lead_id | UUID | FK → crm_leads |
| telefone | TEXT | Telefone do lead |
| nome | TEXT | Nome do lead |
| status | TEXT | Status do fluxo (ver abaixo) |
| check_after | TIMESTAMP | Quando verificar novamente |
| template_sent_at | TIMESTAMP | Quando enviou template |
| template_error | TEXT | Erro do template (se houver) |
| zapi_sent_at | TIMESTAMP | Quando enviou via Z-API |
| zapi_error | TEXT | Erro Z-API (se houver) |
| sdr_instance_id | UUID | FK → whatsapp_instances |

**Status possíveis:**
- `aguardando`: Lead na fila, aguardando 5 min
- `lead_respondeu`: Lead mandou mensagem antes do envio
- `template_enviado`: Template enviado com sucesso
- `template_erro`: Template falhou, aguardando fallback
- `zapi_enviado`: Enviado via Z-API do SDR
- `erro_final`: Falhou em todas as tentativas

#### `ad_accounts`
Contas de anúncios (Meta Ads).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| platform | TEXT | "meta" ou "google" |
| account_id | TEXT | ID da conta (sem "act_") |
| account_name | TEXT | Nome da conta |
| access_token_encrypted | TEXT | Token de acesso |
| is_active | BOOL | Ativa |

#### `api_credentials`
Credenciais de APIs externas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| provider | TEXT | "hubspot", "meta", "openai", etc |
| credential_type | TEXT | "api_token", "oauth", etc |
| label | TEXT | Nome amigável |
| value_encrypted | TEXT | Valor da credencial |
| metadata | JSONB | Dados adicionais |
| is_valid | BOOL | Validação OK |

#### `test_phone_numbers`
Números de teste para desenvolvimento.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| phone_number | TEXT | Número |
| description | TEXT | Descrição |
| is_active | BOOL | Ativo |

#### `system_health`
Status de saúde das integrações.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| component | TEXT | Nome do componente |
| status | TEXT | "healthy", "degraded", "unhealthy" |
| status_message | TEXT | Mensagem de status |
| latency_ms | INT | Latência em ms |
| last_check_at | TIMESTAMP | Última verificação |

### Views

#### `lead_attribution_view`
Agrega crm_leads + crm_meetings para atribuição.

```sql
CREATE VIEW lead_attribution_view AS
SELECT 
  cl.id as lead_id,
  cl.nome as lead_name,
  cl.campanha as campaign,
  cl.canal,
  cm.status as deal_stage,
  cm.avaliacao_reuniao as quality,
  cm.valor_proposta as deal_value,
  CASE WHEN cm.status = 'fechado' THEN true ELSE false END as is_won,
  EXTRACT(DAY FROM (cm.data_fechamento - cl.created_at)) as days_to_close
FROM crm_leads cl
LEFT JOIN crm_meetings cm ON cm.lead_id = cl.id;
```

#### `leads_reativacao`
Leads perdidos com informações migratórias para reativação.

#### `leads_perdidos_qualificados`
Leads perdidos mas com score alto.

### Triggers

#### `trg_atualizar_score`
Calcula automaticamente o `score_qualificacao` quando dados migratórios são atualizados.

**Fórmula do Score:**
- Tempo 4+ anos no Brasil: +30 pontos
- RNM indeterminado: +25 pontos
- Cônjuge brasileiro: +10 pontos
- Filhos brasileiros: +10 pontos
- Pais brasileiros: +10 pontos
- País língua portuguesa: +10 pontos
- Celpe-Bras: +5 pontos

**Classificação:**
- Score >= 70: Hot 🔥
- Score 40-69: Qualificado ✅
- Score < 40: Frio ❄️

#### `trg_queue_first_contact`
Insere automaticamente na fila de primeiro contato quando um lead é criado.

```sql
CREATE TRIGGER trg_queue_first_contact
AFTER INSERT ON crm_leads
FOR EACH ROW
EXECUTE FUNCTION fn_queue_first_contact();
```

#### `trg_match_whatsapp_lead`
Vincula automaticamente contatos WhatsApp a leads pelo telefone.

---

## 4. Integrações Externas

### HubSpot
- **API**: v3
- **Token**: Private App Token (em `api_credentials`)
- **Uso**: Sincronizar leads novos
- **Campos sincronizados**: nome, telefone, email, UTMs, hubspot_owner_id

**Owners (SDRs):**
- `88557923` → Hugo Valentin
- `88557924` → Júnior Dias

### Meta Ads
- **API**: Graph API v21.0
- **Conta**: act_4088228368115401 (EGREGORA MIGRATION + DIMUS)
- **Token**: Permanente (em `ad_accounts.access_token_encrypted`)
- **Uso**: Buscar spend por campanha

### WhatsApp Business API (Oficial)
- **Phone Number ID**: 1050550788146572
- **Número**: +55 61 9571-0622
- **WABA ID**: 832071919915517
- **Token**: Em `api_credentials` (provider: meta)
- **Uso**: Enviar templates, receber mensagens

### Z-API (Não-Oficial)
- **Instância Hugo**: 3F11BA1406076279538F2295B0810B48
- **Número Hugo**: 5561993105477
- **Uso**: Fallback quando template falha

### OpenAI
- **Modelo**: gpt-4o-mini
- **Token**: Em `api_credentials` (provider: openai)
- **Uso**: Gestor Comercial IA

---

## 5. Fluxos Automatizados

### Fluxo de Primeiro Contato

```
Lead cadastra no HubSpot
        ↓
   Sync (5 min)
        ↓
Lead inserido no crm_leads
        ↓
Trigger insere em lead_first_contact
(status: aguardando, check_after: +5 min)
        ↓
   Cron (2 min)
        ↓
Lead mandou mensagem? ──SIM──→ status: lead_respondeu
        │                              ↓
       NÃO                     Nina qualifica
        ↓
Envia template API Oficial
        ↓
    Sucesso? ──SIM──→ status: template_enviado
        │
       NÃO
        ↓
status: template_erro
check_after: +5 min
        ↓
   Cron (2 min)
        ↓
Busca SDR pelo hubspot_owner_id
        ↓
Envia via Z-API do SDR
        ↓
status: zapi_enviado
```

### Fluxo de Sync HubSpot

```
Cron (5 min) ──→ sync-hubspot-leads
        ↓
Busca leads criados nas últimas 2h
        ↓
test_only: true? ──SIM──→ Filtra só números de teste
        │
       NÃO
        ↓
Para cada lead:
  - Normaliza telefone
  - Deriva campanha (UTM ou source)
  - Insere/atualiza em crm_leads
        ↓
Trigger cria registro em lead_first_contact
```

### Fluxo de Qualificação (Nina)

```
Lead responde no WhatsApp
        ↓
Nina (IA) faz perguntas de qualificação
        ↓
Extrai dados migratórios
        ↓
[QUALIFICACAO_COMPLETA] + JSON
        ↓
Edge Function process-qualification
        ↓
Atualiza crm_leads com dados migratórios
        ↓
Trigger calcula score_qualificacao
```

---

## 6. Edge Functions (Supabase)

### `sync-hubspot-leads`
Sincroniza leads do HubSpot para o Supabase.

**Parâmetros:**
- `since_hours` (default: 24): Buscar leads das últimas X horas
- `limit` (default: 100): Máximo de leads
- `test_only` (default: true): Só sincronizar números de teste

**Retorno:**
```json
{
  "success": true,
  "hubspot_total": 29,
  "created": 10,
  "updated": 5,
  "skipped": 14,
  "test_only": true,
  "test_phones_count": 3
}
```

### `sync-hubspot-utm`
Atualiza UTMs de leads existentes.

### `first-contact-flow`
Processa fila de primeiro contato.

**Fluxo:**
1. Busca leads com `status: aguardando` e `check_after < now()`
2. Verifica se lead mandou mensagem
3. Se não, envia template
4. Busca leads com `status: template_erro` e `check_after < now()`
5. Envia via Z-API do SDR atribuído

### `meta-campaign-spend`
Busca gastos por campanha no Meta Ads.

**Parâmetros:**
- `date_preset`: "last_7d", "last_30d", "last_90d"

**Retorno:**
```json
{
  "campaigns": [
    {
      "campaign_id": "123",
      "campaign_name": "[Y][Leads] - Leadads",
      "internal_campaign": "[Y][Leads] - Leadads",
      "spend": 13036.39,
      "impressions": 500000,
      "clicks": 2500
    }
  ],
  "totals": { "spend": 15680.38 }
}
```

### `process-qualification`
Processa output da qualificação da Nina.

### `health-check`
Verifica status de todas as integrações.

---

## 7. Cron Jobs

| Job | Schedule | Descrição |
|-----|----------|-----------|
| `sync-hubspot-leads-5min` | */5 * * * * | Sync leads (modo teste) |
| `first-contact-flow` | */2 * * * * | Processa primeiro contato |
| `health-check-5min` | */5 * * * * | Verifica saúde das integrações |
| `process-lead-queue` | * * * * * | Processa fila de leads |

---

## 8. Páginas do Sistema

### Comercial
- `/dashboard` — Dashboard principal
- `/leads` — Lista de leads
- `/pipeline` — Pipeline visual (Kanban)
- `/pre-venda` — Gestão de pré-venda
- `/vendas` — Gestão de vendas
- `/followup` — Follow-ups pendentes
- `/forecast` — Previsão de vendas
- `/reativacao` — Leads para reativação

### Operações
- `/meetings` — Reuniões agendadas
- `/proposals` — Propostas
- `/propostaenvio` — Envio de propostas
- `/targets` — Metas

### Tráfego Pago
- `/trafego` — Dashboard de Ads
- `/atribuicao` — Atribuição por campanha
- `/roi` — ROI por canal

### Conversas
- `/conversas` — Chat WhatsApp integrado

### IA & Reports
- `/gestor-ia` — Chat com IA sobre dados
- `/wbr-ai` — Relatórios IA

### Sistema
- `/settings` — Configurações
- `/users` — Usuários
- `/notificacoes` — Notificações

---

## 9. Status Atual

### ✅ Funcionando

| Componente | Status | Observações |
|------------|--------|-------------|
| Supabase | ✅ | Banco principal |
| Auth | ✅ | Login funcionando |
| CRM (Leads) | ✅ | CRUD completo |
| CRM (Meetings) | ✅ | Pipeline funcional |
| WhatsApp Oficial | ✅ | Envio/recebimento OK |
| WhatsApp Z-API | ✅ | Hugo conectado |
| Sync HubSpot | ✅ | Modo teste (5 min) |
| Primeiro Contato | ✅ | Fluxo automático |
| Atribuição | ✅ | Dados reais |
| Gestor IA | ✅ | OpenAI integrado |
| Meta Ads | ✅ | Token permanente |
| Health Check | ✅ | Monitoramento ativo |

### ⚠️ Parcialmente Funcional

| Componente | Status | Pendência |
|------------|--------|-----------|
| Reativação | ⚠️ | Falta importar dados históricos |
| SDR Júnior | ⚠️ | Z-API não configurado |
| Sync Completo | ⚠️ | Ainda em modo teste |

### ❌ Não Implementado

| Componente | Prioridade | Descrição |
|------------|------------|-----------|
| Google Ads | Média | Integração com API |
| Astra | Baixa | Sem API disponível |
| Notificações Push | Baixa | Alertas em tempo real |

---

## 10. Pendências e Próximos Passos

### Alta Prioridade

1. **Configurar Z-API do Júnior**
   - Criar instância no Z-API
   - Preencher `zapi_instance_id`, `zapi_token`, `zapi_client_token`
   - Tabela: `whatsapp_instances` (id do Júnior: `6b3b398f-ed3c-4b29-86b6-d489cda0ddff`)

2. **Ativar Sync Completo**
   - Mudar cron para `test_only: false`
   - SQL:
   ```sql
   SELECT cron.unschedule('sync-hubspot-leads-5min');
   SELECT cron.schedule('sync-hubspot-leads-5min', '*/5 * * * *', 
     $$SELECT net.http_post(
       url := 'https://zxwkjogjbyywufertkor.supabase.co/functions/v1/sync-hubspot-leads',
       headers := '{"Content-Type":"application/json","Authorization":"Bearer ..."}',
       body := '{"test_only": false}'::jsonb
     )$$
   );
   ```

3. **Importar Leads Históricos com Qualificação**
   - Usar CSV via `/reativacao`
   - Ou rodar sync com `since_hours: 2160` (90 dias)

### Média Prioridade

4. **Integrar Google Ads**
   - Obter OAuth token
   - Criar Edge Function similar ao meta-campaign-spend

5. **Dashboard de Atribuição Mais Rico**
   - Adicionar CPL, CAC, ROAS por campanha
   - Gráficos de tendência

6. **Melhorar Nina (IA de Qualificação)**
   - Ajustar prompts para extração de dados
   - Implementar retentativas

### Baixa Prioridade

7. **Notificações em Tempo Real**
   - WebSocket ou Supabase Realtime
   - Alertas para novos leads, mensagens

8. **App Mobile**
   - PWA ou app nativo
   - Notificações push

---

## 11. Credenciais e Acessos

### 1Password (Cofre: Openclaw)

| Item | Conteúdo |
|------|----------|
| OpenAI — API Key | API key GPT-4 |
| Meta Ads Token | Token permanente |
| HubSpot Token | Private App Token |

### Supabase

- **Project Ref**: zxwkjogjbyywufertkor
- **Anon Key**: eyJhbGciOiJIUzI1NiIs... (público)
- **Service Role Key**: eyJhbGciOiJIUzI1NiIs... (secreto, em 1Password)

### Meta Business

- **Business ID**: 832071919915517
- **Ad Account**: act_4088228368115401
- **Phone Number ID**: 1050550788146572

### Z-API (Hugo)

- **Instance ID**: 3F11BA1406076279538F2295B0810B48
- **Token**: E248206FAAF8D5304FAF0C45
- **Client Token**: F8e87becebf4a4a9eadafd903cd09d148S

---

## 12. Troubleshooting

### Sync HubSpot não está criando leads
1. Verificar se `test_only: true` no cron
2. Verificar se números de teste estão em `test_phone_numbers`
3. Verificar logs da Edge Function no dashboard Supabase

### Template WhatsApp não está enviando
1. Verificar se template está `approved` em `whatsapp_templates`
2. Verificar credenciais Meta em `api_credentials`
3. Verificar se `phone_number_id` está correto

### Z-API não está enviando
1. Verificar se instância está `is_connected: true`
2. Verificar se `zapi_instance_id` e `zapi_token` estão preenchidos
3. Testar conexão no painel Z-API

### Gestor IA não responde
1. Verificar credencial OpenAI em `api_credentials`
2. Verificar se `is_valid: true`
3. Verificar logs no console do navegador

### Atribuição mostrando dados vazios
1. Verificar se view `lead_attribution_view` existe
2. Verificar se leads têm `campanha` preenchida
3. Verificar se meetings têm `avaliacao_reuniao` preenchida

---

## Contato

- **Gabriel Lopes** (CEO): @Lops16 (Telegram)
- **Hera** (IA Sócia): Disponível via OpenClaw

---

*Documento gerado automaticamente. Última atualização: 2026-04-04 18:56 UTC*
