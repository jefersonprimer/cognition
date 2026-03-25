# Relatório de Melhorias e Performance - Cognition

Este documento detalha os pontos críticos identificados na arquitetura atual do projeto e o roteiro de pendências ordenado por impacto.

---

## 1. [ALTO] Estrutura de Dados e Parsing de Texto
**Local:** `SupabaseNoteRepository.ts` e `lib/editorSerializer.ts`

*   **Problema:** O uso de strings mágicas (`p:id|name`) dentro do campo `description` exige processamento pesado de strings (`split`, `filter`, `join`) em cada leitura/escrita.
*   **Impacto:** Dificuldade em manter a integridade das referências e custo computacional desnecessário no servidor de borda (Vercel/Next.js).
*   **Solução Recomendada:**
    *   Migrar o armazenamento de HTML para o formato **JSON (ProseMirror)** do Tiptap.
    *   Isso permite que as referências sejam tratadas como nós (nodes) estruturados, facilitando buscas e atualizações sem regex ou manipulação de string bruta.

---


## Próximos Passos (Prioridades):

1.  **Curto Prazo:** Migrar o armazenamento do editor para JSON para eliminar o parsing manual de strings.
