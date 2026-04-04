# Configuração do Webhook HubSpot → Command Center

## Passo a Passo

### 1. Criar Workflow no HubSpot

1. Acesse **HubSpot → Automation → Workflows**
2. Clique em **Create workflow**
3. Selecione **Contact-based** (baseado em contatos)
4. Trigger: **"Contact is created"** (quando contato é criado)

### 2. Adicionar Ação de Webhook

1. Clique no **+** para adicionar ação
2. Selecione **"Send a webhook"**
3. Configure:

**Method:** `POST`

**Webhook URL:**
```
https://zxwkjogjbyywufertkor.supabase.co/functions/v1/hubspot-webhook
```

**Request body (JSON):**
```json
{
  "phone": "{{contact.mobilephone}}",
  "name": "{{contact.firstname}} {{contact.lastname}}",
  "email": "{{contact.email}}",
  "hubspot_contact_id": "{{contact.hs_object_id}}",
  "sdr_hubspot_owner_id": {{contact.hubspot_owner_id}}
}
```

### 3. Salvar e Ativar

1. Clique em **Review and publish**
2. Ative o workflow

---

## Mapeamento de Campos

| HubSpot | Command Center | Descrição |
|---------|----------------|-----------|
| `contact.mobilephone` | `phone` | Telefone do lead |
| `contact.firstname` | `name` (parte 1) | Primeiro nome |
| `contact.lastname` | `name` (parte 2) | Sobrenome |
| `contact.email` | `email` | E-mail |
| `contact.hs_object_id` | `hubspot_contact_id` | ID único do contato |
| `contact.hubspot_owner_id` | `sdr_hubspot_owner_id` | ID do SDR responsável |

---

## IDs dos SDRs no HubSpot

| SDR | HubSpot Owner ID | Supabase ID |
|-----|------------------|-------------|
| Hugo Valentin | 88557923 | ca6fc8aa-ce24-4389-ba2a-b5c8840d10b1 |
| Júnior Dias | 88557924 | edeb2cfd-c431-400a-88a0-69c5a412b1c6 |

---

## Modo de Teste

Enquanto em teste, apenas números cadastrados em `test_phone_numbers` serão processados.

**Números de teste atuais:**
- 5561999018857
- 5561998757348
- 5561981273886

Para adicionar mais números de teste:
```sql
INSERT INTO test_phone_numbers (phone_number, description)
VALUES ('5561XXXXXXXXX', 'Descrição do teste');
```

---

## Fluxo Completo

```
HubSpot (Lead criado)
       ↓
Webhook POST → /hubspot-webhook
       ↓
Verifica test_phone_numbers
       ↓
Se número autorizado → lead_automation_queue (status: waiting, 5 min)
       ↓
Cron executa a cada minuto
       ↓
Se lead não respondeu:
  1. Tenta template via API Oficial (Meta)
  2. Se falhar → Fallback via Z-API (SDR)
       ↓
Mensagem enviada
```

---

## Troubleshooting

### Lead não entrou na fila
- Verificar se o número está em `test_phone_numbers`
- Checar logs: `SELECT * FROM lead_automation_log ORDER BY created_at DESC LIMIT 20;`

### Template não enviou
- Verificar se app Meta está publicado
- Verificar se template está aprovado e cadastrado em `whatsapp_templates`
- Checar erro nos logs

### Fallback não funcionou
- Verificar se instância Z-API está ativa
- Verificar se `sdr_instance_id` está preenchido no lead
