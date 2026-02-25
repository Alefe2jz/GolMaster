# Arquitetura do GolMaster

## 1. Estrutura do Monorepo
- `apps/mobile`: app Expo (React Native) para usuários finais.
- `apps/web`: app web com React Router e rotas de servidor.
- `backend`: API Node.js + Express e acesso a dados com Prisma.
- `infra`: infraestrutura local (`docker-compose.yml`) com PostgreSQL.

## 2. Arquitetura do Backend (Express + Prisma)
- `backend/src/server.ts`: bootstrap do processo (carrega variáveis de ambiente e inicia o listener).
- `backend/src/app.ts`: composição da aplicação (middlewares, rota de health, montagem de `/api`).
- `backend/src/routes/index.ts`: mapa de rotas que delega cada endpoint para controllers.
- `backend/src/controllers/*`: regras de negócio por domínio (`auth`, `matches`, `friends`, etc.).
- `backend/src/middlewares/auth.ts`: validação de JWT e injeção do contexto do usuário.
- `backend/src/lib/prisma.ts`: instância única do cliente Prisma.
- `backend/prisma/schema.prisma`: modelo relacional e contrato do banco de dados.

## 3. Arquitetura Mobile (Expo)
- `apps/mobile/src/app/*`: telas baseadas em rotas (`(auth)`, `(tabs)`).
- `apps/mobile/src/services/*`: camada de acesso HTTP (`axios`) para endpoints do backend.
- `apps/mobile/src/utils/auth/*`: estado de autenticação e ciclo de vida da sessão (SecureStore + Zustand).
- `apps/mobile/polyfills/*`: adaptadores web/nativo para compatibilidade com o runtime do Expo.

## 4. Arquitetura Web (React Router)
- `apps/web/src/app/*`: arquivos de rota e handlers de API.
- `apps/web/src/__create/*`: utilitários de integração gerados (manter edições manuais no mínimo).
- `apps/web/tsconfig.json`: verificação de tipos estrita para módulos TS e JS.

## 5. Dados e Persistência
- Banco de dados principal: PostgreSQL.
- ORM: Prisma (`User`, `Match`, `Prediction`, `Friend`, `UserSettings`).
- Banco de desenvolvimento local provisionado por `infra/docker-compose.yml`.

## 6. Fluxo de Autenticação
- Email/senha: tratado pelo backend (`/api/register`, `/api/login`).
- Google OAuth (mobile): token é recebido pelo app e validado pelo backend (`/api/auth/google`).
- JWT: emitido pelo backend e reutilizado pelo mobile via `Authorization: Bearer <token>`.

## 7. Diretrizes de Manutenção
- Mantenha os controllers focados em lógica de negócio e evite ramificações específicas de transporte.
- Reutilize `lib/prisma.ts` como fonte única do cliente de banco.
- Adicione novos endpoints apenas por `routes/index.ts` + métodos dedicados no controller.
- Prefira remover arquivos/módulos mortos em vez de manter placeholders sem uso.
