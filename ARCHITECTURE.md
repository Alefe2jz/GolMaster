# Arquitetura do GolMaster

## 1. Estrutura do monorepo
- `apps/mobile`: app Expo (React Native) para usuários finais.
- `apps/web`: app web (React Router) e rotas server-side desse frontend.
- `backend`: API Node.js + Express + Prisma.
- `infra`: arquivos de infraestrutura local (`docker-compose.yml`).

## 2. Backend (Express + Prisma)
- `backend/src/server.ts`: bootstrap do processo e inicialização do listener.
- `backend/src/app.ts`: middlewares globais, healthcheck e montagem do prefixo `/api`.
- `backend/src/routes/index.ts`: mapa central de rotas HTTP.
- `backend/src/controllers/*`: regras de negócio por domínio.
- `backend/src/middlewares/auth.ts`: valida JWT e injeta `req.userId`.
- `backend/src/lib/prisma.ts`: instância única do Prisma Client.
- `backend/prisma/schema.prisma`: contrato do banco (PostgreSQL).

### 2.1 Rotas principais da API
- `GET /api/health`
- Auth:
  - `POST /api/register`
  - `POST /api/login`
  - `POST /api/auth/google`
- Matches:
  - `GET /api/matches`
  - `GET /api/matches/:id`
  - `POST /api/matches` (auth)
- Predictions:
  - `GET /api/predictions` (auth)
  - `POST /api/predictions` (auth)
  - `DELETE /api/predictions/:matchId` (auth)  
  Remove um palpite já salvo para a partida.
- Friends:
  - `GET /api/friends` (auth)
  - `POST /api/friends` (auth)
  - `PUT /api/friends/:id` (auth)
  - `DELETE /api/friends/:id` (auth)
- User settings:
  - `GET /api/user-settings` (auth)
  - `PUT /api/user-settings` (auth)
- Sync FIFA:
  - `POST /api/sync-fifa` (auth)
  - `GET /api/sync-fifa` (auth)

## 3. Modelo de dados (Prisma)
Entidades centrais:
- `User`: inclui `friendCode` único para convites por ID.
- `Friend`: relacionamento entre usuários (`pending`/`accepted`).
- `Match`: jogos e metadados de calendário/estádio/status/fase.
- `Prediction`: palpite do usuário por jogo (`@@unique([userId, matchId])`).
- `UserSettings`: idioma, timezone e notificações.

## 4. Mobile (Expo)
- Rotas em `apps/mobile/src/app`:
  - `/(tabs)/index.jsx`: tela Jogos.
  - `/(tabs)/predictions.jsx`: tela Palpites.
  - `/(tabs)/friends.jsx`: tela Amigos.
  - `/(tabs)/settings.jsx`: tela Configurações.
- `apps/mobile/src/app/_layout.jsx`: bootstrap de sessão e providers.
- `apps/mobile/src/services/api.ts`: cliente Axios e header `Authorization`.
- `apps/mobile/src/utils/auth/*`: sessão local (SecureStore + Zustand).

### 4.1 Comportamentos importantes no app
- **Jogos**: filtro "Grupos" usa `stage=group_stage`, e o backend converte para `stage startsWith group_`.
- **Palpites**: modal com contexto completo do jogo, salvar e cancelar/remover palpite.
- **Amigos**: convite por `friend_id` (ID de amigo), não por email.

## 5. Fluxos de autenticação
- Email/senha: backend emite JWT.
- Google OAuth (mobile): app recebe `id_token`, backend valida e emite JWT.
- JWT é persistido no SecureStore e enviado no header Bearer nas rotas protegidas.

## 6. Ambiente e deploy
- Banco principal: PostgreSQL em nuvem (Neon).
- API em nuvem: Render.
- App mobile: build via EAS.
- Sempre aplicar migrações Prisma no ambiente cloud antes de liberar funcionalidades dependentes de schema.

## 7. Diretrizes de manutenção
- Adicionar endpoint novo sempre via `routes/index.ts` + controller dedicado.
- Manter lógica de negócio concentrada em controllers/services, não em rotas.
- Reutilizar `prisma` de `lib/prisma.ts`.
- Evitar duplicação de contrato entre backend e mobile; atualizar tipos de resposta no mobile quando payload mudar.
- Em mudanças de banco, versionar migração e validar compatibilidade com deploy incremental.
