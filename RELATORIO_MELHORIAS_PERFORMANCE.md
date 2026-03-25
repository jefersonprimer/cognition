# Relatório de Melhorias e Performance - Cognition

Este documento detalha os pontos críticos identificados na arquitetura atual do projeto e propõe um roteiro de melhorias ordenado por impacto (do mais grave ao menos grave).

---

## 1. [ALTO] Eficiência de Comunicação e Salvamento (Custo/Performance)
**Local:** `app/[slug]/page.tsx` e `SupabaseNoteRepository.ts`

*   **Problema:** Debounces separados para título e conteúdo geram múltiplas requisições `PUT` desnecessárias. O backend sempre executa um `.update()` e sobrescreve `updated_at`, mesmo que o conteúdo enviado seja idêntico ao atual.
*   **Impacto:** Dobro de carga no Supabase, consumo excessivo de cota de escrita e poluição do histórico de "última modificação".
*   **Solução Recomendada:**
    *   **Unified Debounce:** Criar um único pipeline de salvamento que agrupa título e descrição.
    *   **Smart Diffing:** No repositório ou caso de uso, comparar os dados recebidos com os dados atuais. Se `title === current.title` e `description === current.description`, abortar a operação de escrita.

---

## 2. [MÉDIO] Operações de Banco de Dados em Lote (Escalabilidade)
**Local:** `SupabaseNoteRepository.ts` (Método `emptyTrash` e `removeChildReference`)

*   **Problema:** A lógica de "limpeza" de referências é processada no Node.js através de loops que disparam múltiplas queries individuais (N+1).
*   **Impacto:** Operações de lixeira extremamente lentas para usuários com muitas notas, risco de timeout e inconsistência se uma das 20 requisições falhar no meio.
*   **Solução Recomendada:**
    *   Criar uma **Database Function (RPC)** no PostgreSQL para processar a remoção de referências e limpeza da lixeira em uma única transação atômica no servidor.

---

## 3. [MÉDIO] Estrutura de Dados e Parsing de Texto
**Local:** `SupabaseNoteRepository.ts` e `lib/editorSerializer.ts`

*   **Problema:** O uso de strings mágicas (`p:id|name`) dentro do campo `description` exige processamento pesado de strings (`split`, `filter`, `join`) em cada leitura/escrita.
*   **Impacto:** Dificuldade em manter a integridade das referências e custo computacional desnecessário no servidor de borda (Vercel/Next.js).
*   **Solução Recomendada:**
    *   Migrar o armazenamento de HTML para o formato **JSON (ProseMirror)** do Tiptap.
    *   Isso permite que as referências sejam tratadas como nós (nodes) estruturados, facilitando buscas e atualizações sem regex ou manipulação de string bruta.

---

## 4. [BAIXO] Busca e Indexação (Escalabilidade de Dados)
**Local:** `SupabaseNoteRepository.ts` (Método `search`)

*   **Problema:** O uso de `.ilike('%query%')` não escala. O PostgreSQL não consegue usar índices B-Tree para buscas que começam com caractere coringa (`%`).
*   **Impacto:** A busca ficará lenta (Full Table Scan) assim que o usuário atingir algumas centenas de notas longas.
*   **Solução Recomendada:**
    *   Habilitar o **Postgres Full Text Search** no Supabase.
    *   Utilizar colunas `tsvector` e o operador `.textSearch()` do Supabase para buscas instantâneas e suporte a pesos (ex: título vale mais que o corpo).

---

## 5. [BAIXO] Segurança de Dados e Offline (Resiliência)
**Local:** `NoteEditor.tsx`

*   **Problema:** Se a conexão falhar ou o navegador fechar durante o debounce, o progresso entre o último save e a alteração atual é perdido.
*   **Impacto:** Frustração do usuário por perda de dados (mesmo que pequena).
*   **Solução Recomendada:**
    *   Implementar persistência temporária no **IndexedDB** (via `dexie` ou `localforage`) como um "draft" local.
    *   Sincronizar o draft com o Supabase em background.

---

## Resumo de Prioridades para Implementação:

1.  **Semana 1:** Unificar Debounce e implementar Diff no Repositório.
2.  **Semana 2:** Mover lógicas de limpeza para RPC (Postgres Functions).
3.  **Semana 3:** Implementar Full Text Search e avaliar migração para JSON no Tiptap.
