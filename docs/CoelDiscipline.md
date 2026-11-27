# CoelDiscipline — Contexte projet et spécifications

## 1. Vision

CoelDiscipline est une application Android de discipline personnelle, destinée à un usage personnel, dont le code sera disponible sur GitHub. Aucune publication sur Google Play n'est prévue. Elle permet de prendre des engagements envers soi-même, de suivre leur respect et de mesurer sa constance plutôt que sa productivité.

Exemple : lire 10 pages chaque jour pendant 30 jours consécutifs. Si une journée obligatoire est manquée, le compteur revient à zéro et une nouvelle tentative peut commencer. Les résultats précédents restent consultables.

## 2. Contraintes et état initial

- Nom : **CoelDiscipline**.
- Projet déjà initialisé avec `npx @react-native-community/cli@latest init`.
- React Native CLI, TypeScript, sans Expo.
- Android est la seule plateforme officiellement ciblée (le dossier `ios/` est conservé sans être maintenu).
- Interface en français et en anglais dès la V1, traductions centralisées dans `src/shared/i18n/`, sans dépendance superflue.
- Licence MIT.
- Code, commentaires, documentation technique et README en anglais.
- Les versions debug et release s'installent côte à côte (`com.coeldiscipline.debug` et `com.coeldiscipline`).
- Tout le code métier et applicatif doit être organisé dans `src/`. Les points d'entrée et fichiers natifs restent aux emplacements requis par React Native.
- Architecture local-first : fonctionnement hors ligne, sans compte, sans API distante ni serveur.
- Distribution personnelle par APK signé avec une clé personnelle, jamais versionnée ; releases GitHub envisageables.
- Inspecter le dépôt existant et ses versions avant toute modification. Ne pas réinitialiser le projet.

## 3. Gestion des engagements

Un objectif comporte un identifiant, un titre, une description, une motivation personnelle, une catégorie, une date de début, une durée (7, 21, 30, 60, 90 jours, personnalisée ou illimitée), une fréquence, une heure limite éventuelle, un niveau de difficulté facultatif, un mode de réussite/échec et des rappels.

Catégories proposées : santé, apprentissage, spiritualité, travail, finances, autres ; catégories personnalisables à terme.

Types :

| Type | Exemple | Validation |
|---|---|---|
| Action | Lire chaque jour | Action effectuée |
| Abstinence | Ne pas consommer de sucre | Respect de l'engagement |
| Quantitatif | Faire 50 pompes | Valeur atteignant le seuil |

Fréquences envisagées : quotidienne (MVP), jours spécifiques, plusieurs fois par semaine. Les fréquences avancées nécessitent des règles explicites avant implémentation.

Actions V1 :

- créer et consulter ;
- modifier le titre, la description, la motivation et la catégorie ;
- archiver en conservant l'historique (pas de désarchivage en V1) ; le jour courant n'est pas compté comme manqué ;
- supprimer définitivement, après confirmation, avec toutes les données associées, en une transaction.

La durée n'est plus modifiable dès que l'objectif a commencé. La date de début est aujourd'hui ou une date future. Les modifications de règles affectant le calcul des séries ne doivent pas réécrire silencieusement l'historique.

La V1 ne gère que les objectifs d'action, quotidiens, en mode strict. Les autres champs (type, fréquence, heure limite, difficulté, mode, rappels) seront ajoutés par migration avec leurs règles.

## 4. Règles métier centrales

### Mode strict (par défaut)

- Une validation réussie sur une journée obligatoire incrémente la série d'une unité.
- Une journée obligatoire manquée réinitialise la série à zéro et clôture la tentative interrompue.
- Une nouvelle tentative naît à la première validation qui suit : aucune tentative vide n'est créée. Les jours manqués restent visibles dans l'historique global.
- La durée cible compte des validations consécutives, sans échéance calendaire.
- Une validation peut être annulée jusqu'à la fin de la journée, même si elle avait terminé l'objectif.
- La validation porte la date affichée et est refusée si le jour a changé.
- Atteindre la durée cible en validations consécutives termine la tentative avec succès. Un objectif illimité ne se termine pas automatiquement.
- Une journée encore ouverte et non validée est en attente, pas en échec.
- Un jour non planifié ne rompt pas une série.
- Une validation répétée ne doit jamais incrémenter deux fois le compteur.
- En mode strict, aucune validation rétroactive après la clôture de la journée.
- Le record personnel, les tentatives et les validations historiques sont conservés après un échec.

Exemple : objectif de 30 jours, 8 jours validés, jour 9 manqué, jour 10 validé : série actuelle = 1, record = 8, tentative précédente interrompue, total réussi = 9.

### Temps et réconciliation

La base locale est la source de vérité. Ne pas dépendre d'un timer JavaScript ou d'une tâche Android en arrière-plan pour détecter les échecs. Réconcilier les journées échues au lancement, au retour au premier plan, au passage de minuit et avant les opérations métier. Le traitement doit être idempotent, y compris après plusieurs jours sans ouvrir l'application.

Utiliser des dates calendaires pour les journées et des timestamps pour les événements. Clôture à minuit, sans validation rétroactive.

L'application est un outil personnel de discipline, pas un système anti-triche :

- les journées sont calculées dans un fuseau horaire de référence, initialisé avec celui du téléphone et configurable ;
- les incohérences temporelles sont détectées, et un recul de l'horloge est signalé ;
- un mécanisme explicite permet de récupérer d'une erreur d'horloge ;
- en cas d'anomalie, aucune réconciliation destructrice n'a lieu sans confirmation ;
- une erreur d'horloge ne provoque ni échec irréversible ni blocage durable.

La solution détaillée et ses limites sont décrites dans [decisions/0002-time-handling.md](decisions/0002-time-handling.md) (décision validée).

### Modes futurs

- Flexible : nombre limité d'écarts autorisés.
- Cumulatif : nombre de validations sur une période, sans exigence de consécutivité.
- Progressif : difficulté croissante selon des paliers définis.

Ne pas mélanger ces modes avec le calcul strict avant d'avoir défini leurs invariants.

## 5. Écrans et expérience utilisateur

### Accueil

Date du jour, progression quotidienne (engagements validés / engagements attendus), liste des objectifs actifs, action de validation rapide, série actuelle, progression vers la cible et bouton de création. Afficher clairement les états en attente, réussi, manqué et non planifié.

### Objectifs

Liste des objectifs actifs, terminés et archivés ; formulaire de création/édition ; fiche détaillée avec motivation, règles, progression, record, historique des tentatives et calendrier.

### Calendrier

Vue mensuelle par objectif et vue globale, inspirée du calendrier de contributions GitHub. Vert : réussi ; rouge : manqué ; orange : en attente ; neutre : futur ou non planifié (les distinguer visuellement). Ne pas dépendre uniquement des couleurs pour l'accessibilité.

### Statistiques

Série actuelle, record, nombre de tentatives, jours réussis, jours manqués, taux de réussite, évolution hebdomadaire/mensuelle, résultats par catégorie, jours de la semaine les moins réguliers et objectifs terminés.

Taux de réussite = journées obligatoires réussies / journées obligatoires clôturées, en excluant les jours futurs, non planifiés et encore ouverts. Afficher une absence de données si le dénominateur est nul. Le tableau de bord quotidien utilise un indicateur distinct.

### Journal des échecs

Motif facultatif (oubli, fatigue, manque de temps, procrastination, imprévu, motivation, autre), obstacle rencontré et ajustement envisagé. Le renseignement du journal ne conditionne pas la réinitialisation.

### Paramètres

V1 : fuseau horaire de référence, export et import JSON, informations sur l'application. Ensuite : thème clair/sombre et préférences de notifications.

### Sauvegarde et restauration (V1)

Format JSON versionné, validation des données importées, confirmation avant remplacement des données existantes, restauration transactionnelle et gestion des fichiers invalides. Le tout est testé.

Navigation V1 : pile simple (accueil, création, détail, objectifs terminés et archivés, paramètres). V2 : onglets Accueil, Objectifs, Statistiques, Historique ; paramètres accessibles depuis l'accueil.

## 6. Fonctionnalités complémentaires

| Fonctionnalité | Priorité indicative |
|---|---|
| Notifications locales pour engagements non validés | Haute |
| Export/import JSON avec version de schéma | V1 |
| Archivage | Haute |
| Bilan hebdomadaire | Haute |
| Mode sombre | Haute |
| Widget Android avec validation rapide | Haute, mais après le MVP |
| Minuteur de session | Moyenne |
| Export CSV | Moyenne |
| Sous-tâches quotidiennes | Moyenne |
| Relance automatique des cycles terminés (option) | Moyenne |
| Paliers de réussite 7/30/60/90 jours | Basse |
| Verrouillage biométrique | Basse |

Les notifications sont des rappels, pas la source de vérité métier. Prévoir les permissions Android nécessaires et gérer leur refus. Ne jamais exposer les données personnelles dans le dépôt GitHub.

## 7. Architecture technique proposée

Les choix de bibliothèques suivants sont des recommandations à vérifier selon les versions réellement installées, la compatibilité Android et la maintenance des dépendances :

| Besoin | Proposition |
|---|---|
| Navigation | React Navigation |
| Persistance | SQLite via OP-SQLite |
| État UI partagé | Hooks et contexte en V1 ; Zustand seulement si nécessaire |
| Notifications (V2) | À choisir : Notifee est archivé |
| Dates | Fonctions pures internes en V1 |
| Graphiques (V2) | Vues simples ou react-native-svg |
| Tests unitaires | Jest |
| Tests E2E | Maestro |
| CI | GitHub Actions |

Éviter d'installer toutes les dépendances dès le départ. Introduire chaque bibliothèque lorsqu'une fonctionnalité le justifie. SQLite reste la source de vérité ; Zustand ne doit pas devenir une seconde base de données.

### Organisation de `src/`

Le code est organisé par module fonctionnel :

```text
src/
  App.tsx
  navigation/          # Routes et assemblage des écrans
  modules/
    <Module>/          # Goals, Dashboard, Settings, Backup
      domain/          # Entités, règles et calculs purs
      application/     # Cas d'utilisation, ports
      data/            # Repositories, fichiers, API de l'appareil
      components/  screens/  hooks/
      index.ts         # Seule porte d'entrée du module
  shared/              # database, time, i18n, theme, ui
```

Privilégier une architecture modulaire pragmatique, sans abstractions inutiles. Le domaine ne dépend ni de React Native, ni de SQLite. Un module n'en importe un autre que par son `index.ts`, avec l'alias `@/`. Injecter une horloge dans les règles temporelles pour faciliter les tests. Les écrans appellent les cas d'utilisation ; ils ne recalculent pas les règles métier. Détails : [decisions/0001-architecture.md](decisions/0001-architecture.md).

## 8. Modèle de données conceptuel

- `Goal` : id, title, description, motivation, category, targetDays (vide = illimité), startDate, archivedOn, createdAt, updatedAt.
- `DailyEntry` : id, goalId, date, status (success, missed), validatedAt.
- `FailureLog` (V2) : id, dailyEntryId, reason, notes, createdAt.

Relations : Goal 1:N DailyEntry ; DailyEntry 0:1 FailureLog.

Les tentatives, séries, records et la réussite d'un objectif ne sont pas stockés : ils sont calculés depuis les journées (voir [decisions/0002-time-handling.md](decisions/0002-time-handling.md)). Les autres champs (type, fréquence, valeur cible, unité, heure limite, mode d'échec) seront ajoutés par migration avec leurs règles.

Contraintes : unicité `(goalId, date)`, clés étrangères, suppression en cascade, opérations atomiques, migrations versionnées.

## 9. Roadmap

### V1 — Core (MVP)

Initialisation de l'architecture dans `src/`, français et anglais, export et import JSON, modification et suppression, gestion des anomalies d'horloge, persistance SQLite et migrations, objectifs quotidiens de type action, création/consultation/archivage, validation quotidienne, séries strictes, réconciliation des jours manqués, historique des tentatives, tableau de bord minimal et tests des règles métier.

### V2 — Tracking

Calendrier, statistiques, journal des échecs, notifications locales, bilan hebdomadaire et thème sombre.

### V3 — Advanced

Objectifs quantitatifs et d'abstinence, fréquences avancées, modes alternatifs, widget Android, minuteur, sous-tâches et cycles récurrents.

### V4 — Open Source

Documentation complète, tests E2E, CI GitHub Actions, génération APK et releases GitHub. La documentation et les tests métier commencent dès la V1 ; ne pas attendre la V4 pour les introduire.

## 10. Critères d'acceptation du MVP

- Créer un objectif quotidien de 30 jours et le retrouver après redémarrage, hors ligne.
- Valider aujourd'hui : série = 1 ; répéter la validation : série toujours = 1.
- Valider deux journées consécutives : série = 2.
- Manquer une journée clôturée : série = 0, record conservé, tentative interrompue.
- Reprendre le jour suivant : série = 1, historique précédent intact.
- Laisser l'application fermée plusieurs jours : réconciliation correcte et sans doublons au retour.
- Atteindre 30 validations consécutives : objectif terminé, aucune journée supplémentaire exigée par défaut.
- Ne pas considérer une journée ouverte comme manquée ; refuser une validation rétroactive en mode strict.
- Tester les limites de mois/année, les changements d'heure, les validations répétées et l'idempotence de la réconciliation.

## 11. Consignes pour Claude Code / Codex

Ce document définit le contexte et la cible du projet, pas une demande d'implémenter toutes les versions en une seule fois.

1. Auditer le dépôt existant, ses scripts, versions et conventions.
2. Proposer un plan d'implémentation V1 et signaler les incompatibilités ou décisions métier encore ouvertes.
3. Procéder par étapes cohérentes, en limitant les dépendances et le périmètre à la version demandée.
4. Écrire du TypeScript strict, des noms explicites, des fonctions métier testables et des commentaires utiles uniquement.
5. Ajouter des tests des invariants métier, exécuter les vérifications disponibles et rapporter leurs résultats réels.
6. Proposer des commits Git aux jalons significatifs. Ne pas publier, pousser, signer ou distribuer sans instruction explicite.
7. Documenter les décisions d'architecture et les écarts par rapport à ce document. Ne pas inventer de résultats de tests.
8. Ne pas introduire Expo, de backend, de compte utilisateur, de télémétrie ou de service cloud sans validation explicite.

Décisions à confirmer avant les fonctionnalités concernées : identité visuelle, gestion des pauses et fréquences hebdomadaires, bibliothèque de notifications. Le plan détaillé est dans [implementation-plan.md](implementation-plan.md). Les propositions de ce document peuvent évoluer après audit du dépôt.

## 12. Description GitHub

> Application Android open source de discipline personnelle, de suivi des engagements et de mesure de la régularité. Développée avec React Native et TypeScript, selon une architecture local-first.

Le projet est distribué sous licence MIT.
