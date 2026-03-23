# Documentação de Salvamento de Notas (v2 - Março 2026)

Este documento detalha a implementação atual do mecanismo de salvamento de notas no projeto Cognition, refletindo a arquitetura de **Auto-save com Debounce** e a integração entre o Editor Tiptap e o Supabase.

## 1. Visão Geral da Estratégia
O sistema utiliza um modelo de persistência automática para garantir que o usuário nunca perca dados, sem a necessidade de um botão "Salvar". O salvamento é **reativo** e **diferencial**, disparado apenas quando há mudanças reais após um período de inatividade na digitação.

## 2. Fluxo de Execução no Frontend (`app/[slug]/page.tsx`)

### A. Monitoramento de Estados
O componente `NotePage` monitora dois estados principais: `title` (string) e `editorHtml` (HTML gerado pelo Tiptap).

### B. Mecanismo de Debounce (1000ms)
Um `useEffect` centralizado gerencia o timer de salvamento:
- **Timer:** Sempre que `title` ou `editorHtml` mudam, o timer anterior é limpo (`clearTimeout`) e um novo de 1000ms é iniciado.
- **Comparação Diferencial:** Antes de disparar a API, o sistema compara os valores atuais com `lastSavedTitle` e `lastSavedDescription`. A requisição só ocorre se houver diferença.

### C. Payload Inteligente
Para otimizar o tráfego de rede, o sistema envia apenas o que mudou:
- Se apenas o título mudou: `{ title: "Novo Título" }`
- Se apenas o conteúdo mudou: `{ description: "..." }`
- Se ambos mudaram: `{ title: "...", description: "..." }`

### D. Atualização Dinâmica de Slug
Ao salvar um novo título, o frontend utiliza `window.history.replaceState` para atualizar a URL do navegador com o novo slug (ex: `/minha-nota-abc123`) sem recarregar a página, mantendo a navegação fluida.

## 3. Arquitetura de Backend (Clean Architecture)

O processo de salvamento segue o fluxo de camadas do projeto:

1.  **API Route (`app/api/notes/[[...slug]]/route.ts`):** Recebe o `PUT`, valida a sessão do usuário (JWT) e extrai o `id` da nota da URL.
2.  **Factory (`noteFactory.ts`):** Instancia o caso de uso injetando as dependências necessárias.
3.  **Use Case (`UpdateNoteUseCase.ts`):** Valida as regras de negócio iniciais e delega a persistência.
4.  **Repository (`SupabaseNoteRepository.ts`):** 
    - Executa o `.update()` no Supabase.
    - **Segurança:** Aplica o filtro `.match({ id, user_id: userId })` para garantir isolamento entre usuários.
    - **Timestamp:** Atualiza manualmente o campo `updated_at` com o ISO string atual.

## 4. Integração com Contextos e UI

- **NoteContext:** O salvamento dispara atualizações no `NoteContext` (`updateNoteTitle`, `updateNoteHasContent`). Isso permite que a **Sidebar** e outras partes da interface reflitam a mudança (ex: ícone de nota com conteúdo vs nota vazia) instantaneamente, antes mesmo da resposta da API.
- **FavoriteContext:** Se a nota for marcada como favorita, o salvamento dessa flag ocorre de forma independente via `PATCH`, garantindo que ações de UI não entrem na fila de debounce do conteúdo.

## 5. Resumo Técnico
- **Debounce:** 1 segundo (1000ms).
- **Endpoint:** `PUT /api/notes/[id]`.
- **Método de Persistência:** Diferencial (apenas campos alterados).
- **Banco de Dados:** Supabase (PostgreSQL).
- **Isolamento:** Garantido por `user_id` em todas as queries de escrita.
