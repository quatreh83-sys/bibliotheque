# Bibliothèque de théologie — mise en route

## 1. Base de données (Supabase, gratuit)
1. Créez un compte sur supabase.com → *New project*.
2. *SQL Editor* → collez `supabase/schema.sql` → *Run*.
3. *Authentication → Sign In / Providers* : désactivez « Allow new users to sign up » (c'est vous qui créez les comptes).
4. *Authentication → Users → Add user* : créez votre compte, puis exécutez la dernière ligne du SQL (en commentaire) avec votre email pour devenir administrateur.
5. *Settings → API* : copiez *Project URL* et la clé *anon public* dans `config.js`. (Cette clé est publique par conception ; la sécurité est assurée par les règles RLS du SQL.)

## 2. Comptes étudiants
*Authentication → Users → Add user* (email + mot de passe). Pour afficher leur nom : *Table Editor → profiles → full_name*.

## 3. Importer vos livres depuis Access
Access → *Données externes → Exporter → Fichier texte*. Colonnes : `titre;auteur;annee;domaine;isbn;rayon;etagere;bloc` (voir `livres_exemple.csv`). Dans l'application : connexion admin → *Administration → Importer un fichier CSV*. Les 20 % manquants : ajoutez-les ensuite ou réimportez.

## 4. Tester sur votre ordinateur
Dans ce dossier : `python -m http.server 8000` puis ouvrez http://localhost:8000

## 5. Publier gratuitement
- **Cloudflare Pages** → *Upload assets* → glissez le dossier. Ou **GitHub Pages** (dépôt → Settings → Pages).
- Sur votre autre site : `<a href="ADRESSE-DE-L-APPLICATION">Voir notre bibliothèque</a>`
- Sur téléphone/ordinateur : menu du navigateur → *Installer l'application*.

## 6. Où améliorer
- Plan de la salle (rayons, étagères, blocs) : `config.js`
- Couleurs et design : `styles.css` · Recherche et écrans : `app.js` · Carte 3D : `map3d.js`
- Supabase gratuit se met en pause après ~1 semaine sans visite : ouvrez le site chaque semaine. Gardez toujours votre fichier Access/CSV d'origine.
