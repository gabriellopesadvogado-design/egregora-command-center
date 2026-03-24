

## Migrar Design System para Egrégora Migration

### Resumo
Aplicar a identidade visual Egrégora Migration em toda a plataforma: cores, tipografia, gradients e sidebar.

### Cores do Design System

| Role | HEX | HSL (aprox.) |
|------|-----|-------------|
| Primary (Azul Marinho) | #041E42 | 213 88% 14% |
| Accent (Coral) | #FF5D45 | 8 100% 64% |
| Neutral/Foreground | #262626 | 0 0% 15% |
| Support (Azul Claro) | #93C1F9 | 214 89% 78% |

### Mudanças

| # | Arquivo | O que muda |
|---|---------|-----------|
| 1 | `src/index.css` | Reescrever todas as CSS variables (`:root` e `.dark`) com a paleta Egrégora. Primary = Azul Marinho, Accent = Coral, gradients atualizados. |
| 2 | `src/index.css` | Atualizar gradients (--gradient-primary: Primary→Support, --gradient-accent: Coral-based) e utility classes |
| 3 | `src/index.css` | Adicionar font-face import do Google Fonts (Outfit) como body font |
| 4 | `tailwind.config.ts` | Adicionar fontFamily `outfit` / `sans` apontando para Outfit |
| 5 | `index.html` | Adicionar link do Google Fonts (Outfit) no head |

### Mapeamento de cores (light mode)

- `--primary`: 213 88% 14% (Azul Marinho #041E42)
- `--accent`: 8 100% 64% (Coral #FF5D45)
- `--foreground`: 0 0% 15% (#262626)
- `--background`: 0 0% 98% (#FAFAFA)
- `--ring`: 214 89% 78% (Support #93C1F9)
- `--sidebar-background`: 213 88% 14% (Azul Marinho)
- `--sidebar-accent`: 213 88% 20% (Azul Marinho mais claro)
- `--info`: 214 89% 78% (Support)
- Manter `--success`, `--warning`, `--destructive` como estão (são status universais)

### Dark mode
- `--primary`: 214 89% 78% (Support como primary em dark)
- `--background`: 213 88% 8%
- `--card`: 213 88% 11%
- `--accent`: 8 100% 68% (Coral mais claro)
- `--sidebar-background`: 213 88% 6%

### Tipografia
- Fonte principal: Outfit (fallback geométrico de Lufga, conforme o design system)
- Importar via Google Fonts no `index.html`
- Configurar no Tailwind como font `sans` default

### O que NÃO muda
- Estrutura de componentes, rotas, lógica
- shadcn/ui continua usando CSS variables normalmente
- Nenhuma alteração no banco de dados

