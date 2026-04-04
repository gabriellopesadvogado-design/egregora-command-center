# Egrégora Command Center — Status do Projeto

> Última atualização: 2026-04-04 00:42 UTC
> Documentação para continuidade de desenvolvimento

---

## 📋 Visão Geral

Plataforma unificada de gestão comercial da Egrégora Migration, integrando:
- CRM próprio
- WhatsApp multi-instância (API Oficial + Z-API)
- Automação de qualificação de leads
- Monitoramento de tráfego pago (futuro)
- Landing Pages com tracking (futuro)

---

## 🏗️ Stack Tecnológico

| Componente | Tecnologia | URL/Config |
|------------|------------|------------|
| Frontend | React + Vite + TailwindCSS | Deploy via Vercel |
| Backend | Supabase (PostgreSQL + Edge Functions) | zxwkjogjbyywufertkor.supabase.co |
| WhatsApp Não-Oficial | Z-API | api.z-api.io |
| WhatsApp Oficial | Meta Business API | graph.facebook.com |
| Repositório | GitHub | github.com/gabriellopesadvogado-design/egregora-command-center |
| Credenciais | 1Password | Cofre: Openclaw |

---

## 🔐 Credenciais (1Password - Cofre Openclaw)

| Item | Descrição |
|------|-----------|
| Supabase — Astra (Command Center) | URL + Service Role Key |
| Z-API - Comercial | Instance ID + Token + Client-Token |
| Meta WhatsApp API - Egrégora | Access Token + Phone Number ID + WABA ID |

---

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

```
whatsapp_instances      → Instâncias WhatsApp (Z-API e API Oficial)
whatsapp_contacts       → Contatos/Leads
whatsapp_conversations  → Conversas ativas
whatsapp_messages       → Mensagens trocadas
whatsapp_templates      → Templates aprovados no Meta

lead_automation_queue   → Fila de automação de leads
lead_automation_log     → Log de ações da automação
test_phone_numbers      → Números autorizados para teste

core_users              → Usuários do sistema (SDRs, Closers, Admin)
api_credentials         → Credenciais de APIs externas
```

### Relacionamentos Chave

```
whatsapp_instances.user_id → core_users.id (vincula instância ao SDR)
lead_automation_queue.sdr_instance_id → whatsapp_instances.id
lead_automation_queue.contact_id → whatsapp_contacts.id
core_users.hubspot_owner_id → ID do owner no HubSpot
```

---

## 👥 Equipe no Sistema

| Nome | Cargo | HubSpot Owner ID | ID Supabase |
|------|-------|------------------|-------------|
| Hugo Valentin | SDR | 88557923 | ca6fc8aa-ce24-4389-ba2a-b5c8840d10b1 |
| Júnior Dias | SDR | 88557924 | edeb2cfd-c431-400a-88a0-69c5a412b1c6 |
| Victor Lira | Closer | 76170273 | 33e8ba5a-372a-4f38-a93c-0a5a4b25b41b |
| Larissa Castro | Closer | 82186168 | 1665b69f-75f8-48f8-b0ea-e9f8cff5ed5b |
| Gabriel Lopes | Admin | 77133902 | f3092b27-93ea-4029-9f9e-10dc25d6991e |

---

## 📱 Instâncias WhatsApp

### Configuradas

| Nome | Tipo | Número | Provider | Status |
|------|------|--------|----------|--------|
| SDR Hugo | SDR | 61 99310-5477 | Z-API | ✅ Ativo |
| Egrégora (Oficial) | Recepção/Nina | 61 9571-0622 | Meta API | ✅ Configurado |

### Pendentes

| Nome | Tipo | Status |
|------|------|--------|
| SDR Júnior | SDR | ⏳ Aguardando número |

---

## 🤖 Fluxo de Automação de Leads

```
1. Lead cadastrado no HubSpot
         ↓
2. Webhook envia para /hubspot-webhook
         ↓
3. Verifica se número está na lista de teste
         ↓
4. Se sim → Cria contato + Entra na fila (status: waiting)
         ↓
5. Aguarda 5 minutos (wait_until)
         ↓
6. Cron executa /process-lead-queue a cada minuto
         ↓
7. Se lead não respondeu:
   - Tenta enviar template via API Oficial
   - Se falhar → Fallback para Z-API do SDR
         ↓
8. Lead responde → Status muda para 'qualifying'
         ↓
9. Nina assume qualificação (futuro)
```

---

## 🔧 Edge Functions

| Função | Descrição | JWT |
|--------|-----------|-----|
| zapi-webhook | Recebe mensagens do Z-API | no-verify |
| send-zapi-message | Envia mensagens via Z-API | no-verify |
| hubspot-webhook | Recebe leads do HubSpot | no-verify |
| process-lead-queue | Processa fila de automação | no-verify |
| update-contact-photos | Atualiza fotos de perfil | no-verify |

### Deploy de Funções

```bash
cd egregora-command-center
SUPABASE_ACCESS_TOKEN=<token> supabase functions deploy <nome> --project-ref zxwkjogjbyywufertkor --no-verify-jwt
```

---

## ⏰ Cron Jobs (pg_cron)

| Job | Schedule | Função |
|-----|----------|--------|
| process-lead-queue | * * * * * (cada minuto) | Processa fila de leads |

---

## 🧪 Modo de Teste

Para testar sem afetar produção, números devem estar na tabela `test_phone_numbers`:

```sql
-- Números autorizados para teste
SELECT * FROM test_phone_numbers;

-- Adicionar número de teste
INSERT INTO test_phone_numbers (phone_number, description)
VALUES ('5561999999999', 'Teste Fulano');
```

Números de teste atuais:
- 5561999018857
- 5561998757348
- 5561981273886

---

## 📝 Pendências

### Críticas (para funcionar 100%)
- [x] Template `primeiro_contato` aprovado no Meta ✅
- [x] Template testado e funcionando ✅
- [ ] Criar instância Z-API para SDR Júnior

### Melhorias
- [ ] Tela de configuração de instâncias no front-end
- [ ] Dashboard de automação (leads na fila, enviados, etc)
- [ ] Integração Nina (IA de qualificação)
- [ ] Webhook real do HubSpot (atualmente teste manual)
- [ ] Landing Pages com tracking

---

## 🚀 Como Continuar o Desenvolvimento

### 1. Clonar e rodar local
```bash
git clone https://github.com/gabriellopesadvogado-design/egregora-command-center
cd egregora-command-center
npm install
npm run dev  # Roda em localhost:8080
```

### 2. Acessar Supabase
- URL: https://supabase.com/dashboard/project/zxwkjogjbyywufertkor
- Credenciais: 1Password → "Supabase — Astra (Command Center)"

### 3. Deploy de mudanças
```bash
git add -A
git commit -m "feat: descrição"
git push origin main  # Auto-deploy no Vercel
```

### 4. Deploy de Edge Functions
```bash
SUPABASE_ACCESS_TOKEN=<token> supabase functions deploy <nome> --project-ref zxwkjogjbyywufertkor --no-verify-jwt
```

---

## 📁 Estrutura de Pastas

```
egregora-command-center/
├── src/
│   ├── components/
│   │   ├── whatsapp/          # Chat, mensagens, input
│   │   └── settings/          # Configurações
│   ├── hooks/
│   │   └── whatsapp/          # useWhatsApp, useWhatsAppSend, etc
│   ├── pages/                 # Páginas da aplicação
│   └── utils/                 # Utilitários
├── supabase/
│   ├── functions/             # Edge Functions
│   └── migrations/            # SQL migrations
└── docs/                      # Documentação adicional
```

---

## 🔗 URLs Importantes

| Serviço | URL |
|---------|-----|
| App (Produção) | https://egregora-command-center.vercel.app |
| Supabase Dashboard | https://supabase.com/dashboard/project/zxwkjogjbyywufertkor |
| GitHub Repo | https://github.com/gabriellopesadvogado-design/egregora-command-center |
| Z-API Painel | https://app.z-api.io |
| Meta Business | https://business.facebook.com/wa/manage |

---

## 📞 Contatos

- **Gabriel Lopes** (CEO) — @Lops16 no Telegram
- **Repositório Issues** — Para bugs e features

---

*Documento gerado para facilitar transição entre IAs ou desenvolvedores.*
