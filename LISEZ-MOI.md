# Bibliothèque de théologie
- `docs/` = **front-end** (le site : GitHub Pages, réglage *Branch main → /docs*)
- `supabase/` = **back-end** (base de données, comptes, sécurité) : `schema.sql`, puis `migration_2.sql` si la base existe déjà
- `docs/config.js` : clés Supabase et plan de la salle · `docs/domaines.js` : règles code → domaine · `docs/styles.css` : design
- Import : Access → Fichier texte (UTF-8, séparateur ;, noms de champs en 1re ligne) → Administration → Importer.
- Test local : `cd docs && python -m http.server 8000`
