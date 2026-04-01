# Egrégora Command Center

Plataforma unificada para gestão comercial, tráfego pago e comunicação WhatsApp da Egrégora Migration.

## 🎯 Funcionalidades

### CRM Comercial
- Dashboard com metas e rankings
- Gestão de leads com qualificação
- Pipeline Kanban de deals
- Follow-up automatizado com cadência
- Propostas e geração de PDF
- Reativação de leads perdidos
- Relatórios WBR gerados por IA

### Tráfego Pago
- Dashboard Meta Ads e Google Ads em tempo real
- Métricas por campanha, ad set e criativo
- ROI, ROAS, CAC, CPL por canal
- Alertas de performance (melhores e piores criativos)
- Conversions API (loop fechado de conversão)

### WhatsApp (Conversas)
- Multi-instâncias: Recepção, SDR, Closer
- Agente IA "Nina" para qualificação automática
- Chat unificado com histórico
- Client Memory para contexto de cada lead
- Transferência automática para humanos

## 🛠️ Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions + Auth)
- **APIs:** Meta Ads, Google Ads, Evolution API (WhatsApp)
- **IA:** OpenAI GPT-4 / GPT-4o-mini

## 📦 Instalação

```bash
# Clonar o repositório
git clone https://github.com/gabriellopesadvogado-design/egregora-command-center.git
cd egregora-command-center

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Rodar em desenvolvimento
npm run dev
```

## ⚙️ Configuração

### 1. Supabase
O projeto está conectado ao Supabase Command Center existente.
As migrations estão em `supabase/migrations/`.

### 2. Meta Ads
Configure em **Settings > Tráfego**:
- Conecte via OAuth ou insira Access Token + Account ID manualmente

### 3. Google Ads
Configure em **Settings > Tráfego**:
- Developer Token
- Client ID / Client Secret
- Refresh Token
- Customer ID

### 4. WhatsApp (Evolution API)
Configure em **Settings > WhatsApp**:
- URL da Evolution API
- API Key
- Configure instâncias para Recepção, SDR e Closer

### 5. Conversions API
Configure em **Settings > Tráfego > Conversions API**:
- Meta Pixel ID
- Conversions API Token
- Ative "Enviar para Meta" para disparar eventos automaticamente

### 6. OpenAI
Configure nas Edge Functions do Supabase:
- Adicione `OPENAI_API_KEY` como secret

## 📁 Estrutura

```
egregora-command-center/
├── src/
│   ├── components/
│   │   ├── dashboard/     # Componentes do dashboard CRM
│   │   ├── layout/        # Sidebar e layout
│   │   ├── pipeline/      # Kanban e deals
│   │   ├── trafego/       # Dashboard de tráfego
│   │   ├── whatsapp/      # Chat e conversas
│   │   └── ui/            # Componentes shadcn/ui
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useMetaConnection.ts
│   │   ├── useMetaDashboard.ts
│   │   ├── useMetaInsights.ts
│   │   └── ...
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Leads.tsx
│   │   ├── Pipeline.tsx
│   │   ├── Trafego.tsx
│   │   ├── Conversas.tsx
│   │   ├── Settings.tsx
│   │   └── ...
│   └── integrations/
│       └── supabase/
├── supabase/
│   ├── functions/         # Edge Functions
│   │   ├── meta-api/
│   │   ├── google-ads-api/
│   │   ├── evolution-webhook/
│   │   ├── send-conversion-event/
│   │   └── ...
│   └── migrations/        # Database migrations
└── public/
```

## 🚀 Deploy

### Supabase Edge Functions
```bash
# Login no Supabase CLI
npx supabase login

# Link ao projeto
npx supabase link --project-ref zxwkjogjbyywufertkor

# Deploy das functions
npx supabase functions deploy
```

### Frontend
Deploy via Vercel, Netlify ou Lovable.

## 📝 Campos para Configurar

Após o deploy, configure via interface:

1. **Settings > Integrações**
   - [ ] HubSpot Private App Token
   - [ ] Evolution API URL e Key
   - [ ] OpenAI API Key

2. **Settings > Tráfego**
   - [ ] Meta Ads (OAuth ou Token + Account ID)
   - [ ] Google Ads (Developer Token + OAuth + Customer ID)
   - [ ] Conversions API (Pixel ID + Token)

3. **Settings > WhatsApp**
   - [ ] Instância Recepção (API Oficial)
   - [ ] Instância SDR (API Não Oficial)
   - [ ] Instância Closer (API Não Oficial)
   - [ ] Prompt do Agente Nina

4. **Settings > IA & Automação**
   - [ ] Ativar qualificação automática
   - [ ] Configurar critérios de qualificação
   - [ ] Ativar WBR Reports automáticos

## 📊 Métricas Disponíveis

### Comercial
- Leads por período e origem
- Taxa de qualificação (MQL → SQL)
- Taxa de conversão (SQL → Cliente)
- Ticket médio e receita
- Performance por SDR e Closer

### Tráfego
- Gasto, Impressões, Cliques
- CTR, CPC, CPM, CPL
- ROAS, ROI, CAC
- Performance por campanha e criativo
- Análise de Hook/Corpo/CTA (via retenção)

---

Desenvolvido para Egrégora Migration por Hera 🌟
