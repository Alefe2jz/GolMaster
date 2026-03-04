# GolMaster Backend (Estado Atual)

API em Node.js + Express + Prisma (PostgreSQL), usada hoje pelo app mobile.

## 1. Base URLs

- `dev`: `http://localhost:3333/api`
- `prod`: `https://golmaster-api.onrender.com/api`
- `staging`: nao configurado no momento

Health checks:

- `GET /` -> `GolMaster backend online`
- `GET /health` -> `{ "ok": true }`
- `GET /api/health` -> `{ "ok": true }`

## 2. Stack Tecnica

- Runtime: Node.js + TypeScript
- HTTP: Express
- ORM: Prisma
- Banco: PostgreSQL (Neon)
- Auth: JWT Bearer (`Authorization: Bearer <token>`)
- Google Auth: `google-auth-library` (validacao de `id_token` no backend)

## 3. Scripts

No diretorio `backend`:

- `npm run dev` -> sobe API em modo desenvolvimento
- `npm run seed` -> executa seed (quando aplicavel)

## 4. Variaveis de Ambiente

Arquivo: `backend/.env`

Obrigatorias para operacao:

- `PORT` (ex: `3333`)
- `DATABASE_URL`
- `JWT_SECRET`

Google login:

- `GOOGLE_CLIENT_ID_WEB`
- `GOOGLE_CLIENT_ID_ANDROID`

Painel admin (novo):

- `CORS_ORIGINS` (opcional, separado por virgula)

Sync da API de jogos:

- `WC2026_API_KEY`
- `WC2026_API_BASE_URL` (opcional, default interno)

## 5. Modelo de Dados Atual (Prisma)

Entidades principais:

- `User`
- `UserSettings`
- `Friend`
- `Match`
- `Prediction`

Observacoes:

- `User.friendCode` e unico.
- `User.passwordHash` pode ser `null` (conta criada por Google).
- `Friend.status`: `pending | accepted`.
- `Prediction` unico por `(userId, matchId)`.

## 6. Padrao de Erros da API

A API retorna erros neste formato:

```json
{ "error": "mensagem" }
```

O painel ADM deve ler preferencialmente `error` (e nao apenas `message`).

## 7. Autenticacao

Middleware `auth` protege rotas privadas.

- Header obrigatorio: `Authorization: Bearer <jwt>`
- JWT payload usa `sub` = `user.id`

### 7.1 Auth Publico

#### `POST /api/register`

Body:

```json
{
  "name": "Nome",
  "email": "email@dominio.com",
  "password": "123456"
}
```

Resposta:

```json
{
  "token": "jwt",
  "user": {
    "id": "uuid",
    "name": "Nome",
    "email": "email@dominio.com",
    "friendCode": "GM-XXXX-0000",
    "image": null
  }
}
```

#### `POST /api/login`

Body:

```json
{
  "email": "email@dominio.com",
  "password": "123456"
}
```

Resposta: mesmo formato de `register`.

#### `POST /api/auth/google`

Body:

```json
{
  "id_token": "google-id-token"
}
```

Resposta: mesmo formato de `register/login`.

## 8. Endpoints Atuais

## 8.1 Users

- `GET /api/users` (auth)
- `DELETE /api/users/me` (auth) -> exclui conta do usuario autenticado e dados relacionados

## 8.2 Matches

- `GET /api/matches` (public)
  - query opcional: `stage`, `status`, `lang`
- `GET /api/matches/:id` (public)
- `POST /api/matches` (auth)

## 8.3 Predictions

- `GET /api/predictions` (auth)
- `POST /api/predictions` (auth)
- `DELETE /api/predictions/:matchId` (auth)

## 8.4 Friends

- `GET /api/friends?status=accepted|pending` (auth)
- `POST /api/friends` (auth) -> convite por `friend_id`
- `PUT /api/friends/:id` (auth) -> `action: accept|decline`
- `DELETE /api/friends/:id` (auth) -> desfaz amizade/remove convite

## 8.5 Settings

- `GET /api/user-settings` (auth)
- `PUT /api/user-settings` (auth)

Body de update aceita:

```json
{
  "language": "pt",
  "timezone": "America/Sao_Paulo",
  "notifications_enabled": true
}
```

## 8.6 Sync FIFA

- `POST /api/sync-fifa` (auth) -> forca sync externo e retorna estatisticas
- `GET /api/sync-fifa` (auth) -> estatisticas atuais

## 9. CORS

Hoje o backend usa:

- `cors({ origin: true, credentials: true })`

Para producao do painel ADM, recomenda-se restringir para dominios explicitos.

## 10. Modulo Admin (novo)

Sem quebrar contratos do mobile, foi adicionado namespace dedicado:

- `POST /api/admin/auth/login`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/block`
- `PATCH /api/admin/users/:id/role`
- `GET /api/admin/games`
- `PATCH /api/admin/games/:id/score`
- `PATCH /api/admin/games/:id`
- `POST /api/admin/notifications`
- `GET /api/admin/notifications`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`

As rotas admin retornam sucesso no formato:

```json
{ "ok": true, "data": {} }
```

E erro no formato:

```json
{ "error": "mensagem" }
```

## 11. Mudancas de modelo (Prisma)

`User` agora inclui:

- `role`: `USER | ADMIN` (default `USER`)
- `isBlocked`: `boolean`
- `blockedAt`: `DateTime?`
- `blockedReason`: `string?`

Novas tabelas:

- `AdminNotification`
- `AdminSetting`

## 12. Deploy seguro (ordem)

1. Rodar migration no banco.
2. Criar pelo menos um usuario com `role=ADMIN`.
3. Ajustar `CORS_ORIGINS` para dominios do mobile e painel.
4. Fazer deploy do backend.
