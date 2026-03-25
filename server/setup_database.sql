-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  parent_id uuid,
  title text NOT NULL,
  description text,
  is_favorite boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notes_pkey PRIMARY KEY (id),
  CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT notes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.notes(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text,
  avatar_url text,
  reset_password_token text,
  reset_password_expires timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE OR REPLACE FUNCTION public.empty_trash_and_cleanup_references(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  WITH deleted_notes AS (
    SELECT id, parent_id
    FROM public.notes
    WHERE user_id = p_user_id
      AND is_deleted = true
      AND parent_id IS NOT NULL
  ),
  parent_updates AS (
    SELECT
      parent.id,
      CASE
        WHEN parent.description IS NULL THEN NULL
        ELSE COALESCE(
          string_agg(line_data.line, E'\n' ORDER BY line_data.ordinality) FILTER (
            WHERE NOT (
              line_data.trimmed_line LIKE 'p:%'
              AND EXISTS (
                SELECT 1
                FROM deleted_notes dn
                WHERE dn.parent_id = parent.id
                  AND replace(lower(split_part(trim(substr(line_data.trimmed_line, 3)), '|', 1)), '-', '') =
                    replace(lower(dn.id::text), '-', '')
              )
            )
          ),
          ''
        )
      END AS next_description
    FROM public.notes AS parent
    JOIN (
      SELECT DISTINCT parent_id
      FROM deleted_notes
    ) AS parents_to_update
      ON parents_to_update.parent_id = parent.id
    LEFT JOIN LATERAL (
      SELECT
        split_lines.line,
        split_lines.ordinality,
        btrim(split_lines.line) AS trimmed_line
      FROM regexp_split_to_table(parent.description, E'\n') WITH ORDINALITY AS split_lines(line, ordinality)
    ) AS line_data ON true
    WHERE parent.user_id = p_user_id
    GROUP BY parent.id, parent.description
  )
  UPDATE public.notes AS parent
  SET
    description = parent_updates.next_description,
    updated_at = now()
  FROM parent_updates
  WHERE parent.id = parent_updates.id
    AND parent.user_id = p_user_id
    AND parent.description IS DISTINCT FROM parent_updates.next_description;

  DELETE FROM public.notes
  WHERE user_id = p_user_id
    AND is_deleted = true;
END;
$$;
