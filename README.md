# FinControl

FinControl é uma aplicação full stack de finanças pessoais em português do Brasil. Ela mantém PostgreSQL como fonte de verdade, calcula saldos a partir do livro de movimentos, isola todos os recursos pelo usuário autenticado e exige revisão humana antes de transformar uma fatura PDF em transações.

## O que está implementado

- Cadastro, verificação de e-mail, login, logout e recuperação de senha reais com Better Auth e Argon2id.
- Onboarding, instituições, contas, categorias, receitas, despesas, transferências e recorrências.
- Cartões como contas-passivo, faturas, pagamentos e compras parceladas com divisão exata de centavos.
- Dashboard com dados do banco, evolução patrimonial, categorias, instituições e movimentações recentes.
- Investimentos e avaliações manuais, relatórios, busca/filtros e exportação CSV/JSON (LGPD).
- Upload privado de PDF, extração de texto, OCR sob demanda, parser extensível, categorização, duplicidade e revisão antes da confirmação.
- Tema claro/escuro, layouts responsivos, estados vazios, skeleton e toasts.
- Exclusão definitiva da conta com confirmação por senha e remoção dos documentos privados.

## Arquitetura

O projeto usa Next.js 16 App Router como interface e backend-for-frontend. Server Components fazem leituras por serviços; Server Actions tratam formulários; Route Handlers ficam reservados a autenticação, arquivos, exportações e jobs. O domínio está em `src/server`, sem dependência de React.

```text
Navegador
  ├─ Server Components / Server Actions
  └─ Route Handlers (auth, upload, export, cron)
          ↓ sessão validada
      serviços de domínio
          ↓ TenantContext obrigatório + transação
      Prisma 7 → PostgreSQL 17 + RLS

PDF privado → extração digital → OCR se necessário → parser → drafts
                                                        ↓ revisão humana
                                              confirmação serializável
```

As principais pastas são:

```text
prisma/                    schema, migration, seed e exemplo de grants
src/app/                   rotas, layouts e endpoints
src/features/              formulários, ações, schemas e UI por domínio
src/server/auth/           autenticação e hash de senha
src/server/database/       Prisma e contexto RLS
src/server/finance/        regras e consultas financeiras
src/server/imports/        extração, OCR, parsers, revisão e retenção
src/server/storage/        storage privado local/Vercel Blob
src/server/workflows/      execução durável de importações
src/shared/                componentes e utilitários tipados
tests/unit|integration|e2e testes por camada
```

### Modelo financeiro

`User` possui `Institution`, `FinancialAccount`, `CreditCard`, `Category`, `Transaction`, `Transfer`, `Invoice`, `ImportedFile`, `Investment` e recorrências. Relações compostas `(id, userId)` impedem associações entre proprietários diferentes. Valores monetários usam `Decimal(19,4)` e são serializados como string.

O saldo é calculado como saldo inicial + créditos − débitos + transferências recebidas − transferências enviadas. Transferências não são receitas ou despesas. O patrimônio soma contas (inclusive o passivo dos cartões) e a última avaliação dos investimentos. Exclusões de lançamentos mudam o estado para `VOIDED`; dados históricos não desaparecem silenciosamente.

O schema completo está em `prisma/schema.prisma`. A migration inicial acrescenta checks financeiros, índices, `pg_trgm` e RLS forçado.

## Requisitos

- Node.js 24 LTS e pnpm 10; ou Docker com Compose.
- PostgreSQL 17.
- Mailpit/SMTP em desenvolvimento; Resend em produção.
- Para OCR nativo, use uma plataforma Node compatível com `@napi-rs/canvas`.

## Execução com Docker

```bash
cp .env.example .env
docker compose up --build
```

A aplicação fica em `http://localhost:3000`, Mailpit em `http://localhost:8025` e PostgreSQL em `localhost:5432`. O volume `private_uploads` não é servido publicamente.

Para preencher o dashboard de desenvolvimento:

```bash
# defina uma senha de 12+ caracteres somente no seu .env
docker compose exec app pnpm db:seed
```

O usuário é `demo@finance.local`; a senha é exclusivamente `SEED_DEMO_PASSWORD`. O seed se recusa a executar com `NODE_ENV=production`.

## Execução sem Docker

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm db:seed       # opcional, exige SEED_DEMO_PASSWORD
pnpm dev
```

Defina `DATABASE_URL` para o papel restrito usado pela aplicação. `DIRECT_URL`, quando preenchida, é usada somente pelo Prisma CLI para migrations. Nunca exponha a URL privilegiada à aplicação em execução.

## Variáveis de ambiente

Consulte `.env.example`. As obrigatórias são `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ caracteres) e `APP_URL`. Em produção também são exigidos `STORAGE_DRIVER=vercel-blob` e `BLOB_READ_WRITE_TOKEN`. Para cadastro, verificação de e-mail e recuperação de senha funcionarem por completo, configure `EMAIL_DRIVER=resend` e uma `RESEND_API_KEY` válida. Sem a chave, as páginas e sessões continuam disponíveis, mas operações que enviam e-mail falham de forma controlada.

- `LOCAL_STORAGE_PATH`: diretório privado no desenvolvimento.
- `CRON_SECRET`: autentica rotinas de recorrência e retenção.
- `SEED_DEMO_PASSWORD`: somente para o seed local.

## Banco, migrations e RLS

```bash
pnpm db:generate
pnpm db:migrate   # desenvolvimento
pnpm db:deploy    # produção/CI, nunca db push
```

Em produção, crie dois papéis: um proprietário usado apenas em migrations (`DIRECT_URL`) e um papel de runtime sem propriedade (`DATABASE_URL`). Depois de migrar, adapte e execute `prisma/production-grants.example.sql` como proprietário. Cada operação financeira usa `SET LOCAL app.current_user_id` e o PostgreSQL aplica a política RLS; o `userId` nunca vem do formulário.

## Importação de faturas

1. O servidor valida sessão, rate limit, cartão e metadados do arquivo.
2. São aceitos PDFs de até 10 MiB, 100 páginas, MIME `application/pdf`, extensão `.pdf` e assinatura `%PDF-`.
3. O SHA-256 impede reenvio do mesmo documento.
4. `pdfjs-dist` extrai texto. Páginas sem texto útil são renderizadas e lidas com Tesseract em português/inglês.
5. O registry seleciona um parser. O MVP inclui `generic-ptbr`; novos bancos implementam `BankStatementParser`.
6. O sistema persiste somente `ImportDraft`, sugere categoria e marca duplicidades exatas/possíveis.
7. O usuário edita/inclui/exclui linhas e confirma. Só então uma transação serializável e idempotente cria os lançamentos.
8. O PDF é apagado após confirmação/cancelamento; a rotina diária elimina abandonados em até 24 horas.

Sem amostras anonimizadas, o parser genérico não promete compatibilidade nominal com todos os layouts bancários. PDFs protegidos por senha são recusados no MVP.

## Qualidade e testes

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Testes de integração exigem um PostgreSQL vazio já migrado e `TEST_DATABASE_URL`. Sem essa variável eles são explicitamente pulados. Para E2E:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

A suíte cobre aritmética decimal, parcelas, ciclos de fatura, fingerprints, parser e isolamento RLS. O workflow de CI sobe PostgreSQL real, aplica migrations e executa lint, TypeScript, testes e build.

## Segurança e privacidade

- Argon2id, verificação de e-mail, sessões persistentes e cookies HttpOnly/Secure/SameSite=Lax.
- CSP com nonce, HSTS, proteção de framing, MIME sniffing e políticas mínimas de navegador.
- Zod no servidor, consultas parametrizadas, relações compostas, RLS e transações `Serializable` nas operações críticas.
- Rate limit distribuído e atômico no próprio PostgreSQL, nomes sanitizados, chaves UUID e blobs privados.
- Logs estruturados removem senha, cookies, tokens e conteúdo de PDFs; respostas públicas usam códigos e `requestId`.
- Exportação de dados e exclusão integral com reautenticação atendem os fluxos básicos de LGPD.

O repositório não contém credenciais. Rotacione todos os segredos, habilite TLS, backups/PITR, proteção de previews e alertas antes de produção.

## Deploy somente na Vercel

A produção foi desenhada para ser operada em um único projeto e painel Vercel. Não há servidor Docker, Redis, worker ou storage externo para administrar separadamente. A Vercel descontinuou o antigo Vercel Postgres; por isso o banco relacional é criado como uma integração nativa do [Marketplace Storage](https://vercel.com/docs/marketplace-storage), que injeta as credenciais e unifica o gerenciamento/cobrança no painel.

1. Autentique e vincule o diretório com `pnpm dlx vercel@latest login` e `pnpm dlx vercel@latest link` (ou importe um repositório pelo painel).
2. Crie um Postgres pelo Marketplace (Neon é a opção recomendada para esta configuração Prisma/pg). Selecione a mesma região das Functions.
3. Crie um [Vercel Blob privado](https://vercel.com/docs/vercel-blob/private-storage) e conecte-o ao projeto.
4. Instale o Resend pelo Marketplace Vercel, verifique o domínio e conecte a variável `RESEND_API_KEY`.
5. Configure `APP_URL`, `BETTER_AUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `STORAGE_DRIVER=vercel-blob`, `EMAIL_DRIVER=resend`, `EMAIL_FROM` e `CRON_SECRET`.
6. Execute `pnpm db:deploy` uma vez com `DIRECT_URL`; o runtime usa somente `DATABASE_URL`.
7. Publique com `pnpm dlx vercel@latest --prod`. `withWorkflow` registra o workflow durável; `vercel.json` agenda recorrências e retenção com [Vercel Cron](https://vercel.com/docs/cron-jobs).
8. Valide login, download autenticado, OCR, CSP, RLS, backups e restauração em um preview protegido antes de promover.

O modo `standalone` é habilitado apenas fora da Vercel para conservar o build Docker local. Na Vercel, o build usa Webpack com o linker hoisted do pnpm para que dependências nativas de PDF/OCR sejam empacotadas sem diretórios simbólicos.

O `Dockerfile` e o Compose existem apenas para desenvolvimento/testes locais; nenhum deles é necessário ou usado na hospedagem Vercel.
