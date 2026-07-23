# Enxoval de Casa Nova — Gabriela & Rian

Aplicação React + Tailwind + Vite, com banco de dados real (Supabase). Qualquer edição feita no modo Admin aparece **na hora** pra qualquer pessoa que abrir o site — sem exportar nada, sem republicar.

## Senha do modo Admin

A senha padrão é `gabrielaerian2026`, definida no topo do arquivo `src/App.jsx`, na constante `ADMIN_PASSWORD`. Troque antes de publicar, se quiser.

**Importante sobre segurança:** essa senha só esconde os botões de edição de quem não sabe dela — ela não é uma trava de segurança forte no banco de dados (o banco fica aberto pra leitura/escrita via a chave pública, como é padrão em projetos assim sem um sistema de contas completo). Bom o suficiente para compartilhar com família e amigos de confiança; evite divulgar o link publicamente.

---

## Parte 1 — Criar o banco de dados (Supabase, gratuito)

1. Acesse https://supabase.com e crie uma conta gratuita.
2. Clique em **New project**. Dê um nome (ex: `enxoval-gabi-rian`), crie uma senha de banco (fica só ali, não é a senha do site) e escolha a região mais próxima.
3. Espere o projeto terminar de ser criado (1-2 minutos).
4. No menu lateral, vá em **Storage** → **New bucket**. Nome: `item-photos`. Marque **Public bucket**. Clique em **Create bucket**. (É aqui que ficam as fotos enviadas do celular/computador.)
5. No menu lateral, clique em **SQL Editor** → **New query**.
6. Abra o arquivo `supabase-schema.sql` (aqui no projeto), copie todo o conteúdo, cole no editor e clique em **Run**. Isso cria as tabelas de categorias e itens, e libera o acesso.
7. Vá em **Project Settings** (ícone de engrenagem) → **API**. Copie:
   - **Project URL**
   - **anon public** (chave longa)

## Parte 2 — Colar as chaves no projeto

8. Abra o arquivo `src/config.js` em qualquer editor de texto (inclusive dá pra editar direto pelo site do GitHub, sem instalar nada).
9. Substitua:
   - `COLE_AQUI_A_URL_DO_SEU_PROJETO_SUPABASE` pela Project URL
   - `COLE_AQUI_A_ANON_KEY_DO_SEU_PROJETO_SUPABASE` pela anon public key
10. Salve.

## Parte 3 — Publicar (recomendado: sem nenhum comando no seu computador)

1. Crie uma conta gratuita em **github.com**.
2. Crie um repositório novo (botão verde **New**), pode ser privado.
3. Na página do repositório, clique em **Add file → Upload files** e arraste TODOS os arquivos e pastas deste projeto (menos `node_modules`, se existir — não deveria vir no zip).
4. Se você editou o `src/config.js` antes de subir, ótimo. Se preferir editar depois, dá pra abrir o arquivo direto no site do GitHub (ícone de lápis) e salvar (“commit”) por lá também.
5. Acesse **netlify.com**, crie uma conta gratuita.
6. **Add new site → Import an existing project** → conecte sua conta do GitHub → escolha o repositório.
7. O Netlify já detecta o comando de build (`npm run build`) e a pasta de saída (`dist`), porque isso está configurado no arquivo `netlify.toml`. É só clicar em **Deploy**.
8. Em 1-2 minutos o site está no ar, num link tipo `https://algum-nome.netlify.app`.
9. (Opcional) Em **Site settings → Change site name**, troque para algo como `enxoval-gabi-rian.netlify.app`.

A partir daqui, o site **não precisa ser republicado de novo** pra novos itens aparecerem — isso já é automático, porque os dados vêm do Supabase, não do código. Você só republica se editar o próprio código (por exemplo, trocar a senha do admin).

## Alternativa — Publicar direto do seu computador (se preferir)

Requer [Node.js](https://nodejs.org) instalado.

```bash
npm install
npm run build
```

Isso gera a pasta `dist/`. Depois: Netlify → **Add new site → Deploy manually** → arraste a pasta `dist`.

## Sobre o backup (Exportar/Importar JSON)

Como os dados já ficam salvos automaticamente no Supabase, o **Backup (Exportar JSON)** agora serve só como uma cópia de segurança — útil se quiser guardar um histórico ou migrar de banco algum dia. O **Restaurar (Importar JSON)** substitui todos os itens do banco pelos do arquivo — use com cuidado, é uma ação para todo mundo, não só pro seu navegador.

## Adicionar à tela de início do iPhone

Depois de publicado, abra o link pelo **Safari** → **Compartilhar** → **Adicionar à Tela de Início**.

## Estrutura do projeto

```
enxoval-vite-app/
├── index.html
├── netlify.toml
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
├── supabase-schema.sql       ← rode isso no SQL Editor do Supabase
└── src/
    ├── App.jsx                ← toda a aplicação (componente único)
    ├── config.js               ← cole aqui a URL e a chave do Supabase
    ├── supabaseClient.js
    ├── main.jsx
    └── index.css
```
