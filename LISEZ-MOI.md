# Bibliothèque du Théologat Saint Jean-Paul II
- `docs/` : site (front-end) · `server.js` : API (back-end) · base PostgreSQL sur Neon · hébergement Render
- `data/catalogue.json.gz` : 11 150 livres (Excel) + 5 655 documents numériques (arborescence). Chargé **automatiquement une seule fois** au premier démarrage.
- `tools/build_catalogue.py` : régénère ce fichier (`python tools/build_catalogue.py LIVRES.xlsx ARBORESCENCE.txt`).
- Classement code → domaine : `docs/domaines.js` (à valider) · plan de la salle : `docs/config.js` · design : `docs/styles.css`
- Variables Render : DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
- `data/ajouts/*.json.gz` : lots d'ajouts au catalogue, appliqués **une seule fois** au démarrage (retraits et sélections conservés). `python tools/build_ajout.py FICHIER.xlsx NOM_DU_LOT` en crée un.
