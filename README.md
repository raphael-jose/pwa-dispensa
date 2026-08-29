# 🏠 Despensa - Controle de Estoque

PWA completa para controle de despensa/estoque doméstico com leitor de código de barras.

## Funcionalidades

- 📷 **Scanner de código de barras** — EAN-13, EAN-8, UPC-A, UPC-E, Code 128, QR Code
- 🔍 **Consulta automática** — Open Food Facts API para identificação de produtos
- 📦 **Controle de quantidade** — Entrada, consumo, ajuste
- 📅 **Controle de validade** — Alertas por vencimento (crítico, atenção, normal)
- 🔔 **Notificações PWA** — Avisos de produtos vencidos/vencendo
- 📱 **Mobile-first** — Interface otimizada para celular
- 🌙 **Modo escuro** — Tema claro e escuro
- 📡 **Offline-first** — Funciona sem internet (IndexedDB)
- ☁️ **Sincronização** — Supabase como backend (opcional)
- 🏷️ **Categorias** — Alimentos, Bebidas, Limpeza, Higiene, Farmácia, Pet, Outros
- 📍 **Locais** — Despensa, Geladeira, Freezer, Armário
- 📊 **Dashboard** — Visão geral com estatísticas e alertas
- 📜 **Histórico** — Registro de todas as movimentações

## Tecnologias

- React 18 + TypeScript
- Vite 6
- Tailwind CSS 3
- Dexie.js (IndexedDB)
- @zxing/library (leitura de código de barras)
- Zustand (estado global)
- Lucide React (ícones)
- date-fns (datas)
- Supabase (backend opcional)
- vite-plugin-pwa (PWA)

## Como rodar

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

```bash
cd despensa-pwa
npm install
```

### Desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:5173` no navegador.

### Build

```bash
npm run build
```

O build será gerado na pasta `dist/`.

### Preview do build

```bash
npm run preview
```

## Configuração do Supabase (Opcional)

O app funciona 100% offline. Para sincronizar entre dispositivos:

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o SQL em `supabase-schema.sql` no editor SQL do Supabase
3. Crie um arquivo `.env`:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

4. Configure a autenticação no Supabase (Email/Password ou Magic Link)
5. O app sincronizará automaticamente quando online

## Deploy

### Vercel

```bash
npm i -g vercel
vercel
```

### Netlify

Suba a pasta `dist/` no Netlify.

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase init hosting
firebase deploy
```

### Manual

Suba a pasta `dist/` em qualquer servidor estático (nginx, Apache, etc).

## Estrutura do projeto

```
src/
├── components/        # Componentes reutilizáveis
├── pages/            # Páginas da aplicação
│   ├── Dashboard.tsx
│   ├── PantryPage.tsx
│   ├── ScannerPage.tsx
│   ├── HistoryPage.tsx
│   └── SettingsPage.tsx
├── scanner/          # Leitor de código de barras
├── services/         # APIs e serviços externos
├── database/         # IndexedDB com Dexie.js
├── stores/           # Estado global (Zustand)
├── types/            # Tipos TypeScript
└── utils/            # Funções utilitárias
```

## Testes

```bash
npm run test
```

## Privacidade

- Dados armazenados localmente no dispositivo
- Ao consultar código de barras, apenas o código é enviado à API
- Nenhuma lista de despensa, histórico ou dados pessoais são enviados
- Supabase com Row Level Security (RLS) — cada usuário vê apenas seus dados

## Licença

MIT
