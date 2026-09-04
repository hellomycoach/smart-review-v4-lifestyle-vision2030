# 📘 DOSSIER TECHNIQUE D'ARCHITECTURE & SPÉCIFICATIONS COMPLÈTES
# SMART REVIEW V5.0 — LIFESTYLE VISION 2030 & TABLE ORDERING SUITE

> **Plateforme SaaS All-in-One pour l'Hospitalité Haut de Gamme** : Commande à table QR Code, Paiements Dématérialisés (Apple Pay / Google Pay / Cartes locales NAPS/Mada), Écran Cuisine KDS en direct, Intelligence Artificielle Nutrition/Fitness (Eat&Fit), Fidélisation VIP & Automatisation d'Avis Clients.

---

## 📑 TABLE DES MATIÈRES
1. [Vue d'Ensemble & Périmètre du Projet](#1-vue-densemble--périmètre-du-projet)
2. [Stack Technique & Choix d'Architecture](#2-stack-technique--choix-darchitecture)
3. [Cartographie des Routes & Applications Frontend](#3-cartographie-des-routes--applications-frontend)
4. [Architecture des APIs & Logique Backend](#4-architecture-des-apis--logique-backend)
5. [Modèle de Données NocoDB & Schémas des Tables](#5-modèle-de-données-nocodb--schémas-des-tables)
6. [Flux Métier & Diagrammes Séquentiels](#6-flux-métier--diagrammes-séquentiels)
   - 6.1. Flux Commande Client & Passerelle Bancaire
   - 6.2. Flux Cuisine KDS & BroadcastChannel
   - 6.3. Flux Eat&Fit Vision IA & Webhook n8n
7. [Sécurité, Conformité & Haute Disponibilité](#7-sécurité-conformité--haute-disponibilité)
8. [Internationalisation & Localisation (i18n)](#8-internationalisation--localisation-i18n)
9. [Déploiement, Hébergement & Procédure d'Exploitation](#9-déploiement-hébergement--procédure-dexploitation)
10. [Guide d'Onboarding d'un Nouveau Restaurant](#10-guide-donboarding-dun-nouveau-restaurant)

---

## 1. Vue d'Ensemble & Périmètre du Projet

**Smart Review v5.0** est une solution complète conçue pour digitaliser l'expérience client et l'exploitation opérationnelle des restaurants, salons de thé et lounges, avec un focus particulier sur la région du Golfe (Qatar, Arabie Saoudite, Émirats) et l'international.

### Les 4 Piliers Fondamentaux :
1. **L'Expérience Client Gastronomique (Dine-in / Takeaway)** :
   * Consultation du menu fluide en Arabe, Anglais et Français.
   * Commande à table pré-verrouillée par QR Code (`?table=XX`).
   * Paiement instantané à table via **Apple Pay (Face ID)**, **Google Pay**, **Cartes bancaires sécurisées (3D-Secure NAPS/Visa)** ou **Règlement en caisse**.
   * Reçu digital interactif et facture fiscale PDF certifiée téléchargeable et partageable sur WhatsApp.
2. **Le KDS & Tour de Contrôle Manager (Kitchen Display System)** :
   * Accès sécurisé par code PIN (géré dans NocoDB).
   * File d'attente des commandes en direct avec alertes sonores (carillon audio).
   * Suivi des 4 statuts : *Reçue ➔ En Cuisine ➔ Prête ➔ Servie*.
   * **Tableau de bord financier temps réel** : Chiffre d'affaires, panier moyen, nombre de ventes, répartition des paiements (En ligne vs Caisse), filtres de période et export comptable CSV/Excel.
3. **Le Module Lifestyle Eat&Fit (IA Vision)** :
   * Prise de photo ou upload du plat/boisson.
   * Estimation des calories et macronutriments par Vision par Ordinateur.
   * Génération immédiate d'une séance de renforcement musculaire de 12 min sans matériel adaptée au niveau du client (débutant, intermédiaire, avancé) envoyée par e-mail et WhatsApp.
4. **L'Impression Automatisée des Supports de Table (Print Studio)** :
   * Générateur de QR codes haute résolution (800x800px, Error Correction Level H - 30%).
   * Personnalisation automatique selon la charte graphique et le logo du restaurant.
   * Export en 1 clic d'une archive ZIP pour l'imprimeur ou impression directe d'une planche A4 de chevalets de table.

---

## 2. Stack Technique & Choix d'Architecture

| Composant | Technologie | Justification Technique |
| :--- | :--- | :--- |
| **Framework Web** | **Next.js 14 (App Router)** | Performance SSR/SSG optimale, typage strict TypeScript, routing dynamique `/order/[instance]`. |
| **Langage** | **TypeScript 5.4** | Zéro typage implicite, robustesse des payloads de commande et sécurité financière. |
| **Styling** | **Tailwind CSS 3.4** | Personnalisation réactive mobile-first, gradients chauds gastronomiques et transitions micro-animées. |
| **Base de Données** | **NocoDB (Self-hosted REST API)** | Flexibilité low-code pour les gérants, synchronisation multi-terminaux, pas de dépendance propriétaire cloud. |
| **Moteur d'Automatisation** | **n8n (Self-hosted)** | Orchestration des webhooks, envoi des notifications WhatsApp, intégration IA et workflows tiers. |
| **Passerelle de Paiement** | **Tap Payments / SkipCash / Stripe** | Support officiel Apple Pay natif, Google Pay, cartes locales NAPS (Qatar) et Mada (KSA), conforme PCI-DSS 3DS2. |
| **Communication Temps Réel** | **BroadcastChannel API + Polling Cloud** | Synchronisation instantanée entre onglets sur le même terminal et synchronisation cloud multi-écrans toutes les 3s. |
| **Génération Documents** | **jsPDF + html2canvas + qrcode + jszip** | Rendu PDF client haute précision sans latence serveur, génération de ZIP et de QR codes vectoriels. |

---

## 3. Cartographie des Routes & Applications Frontend

### 📱 3.1. Routes Publiques & Clients
* **`/order/[instance]`** :
  * Page principale de commande à table.
  * Récupération dynamique du menu depuis NocoDB (`/api/menu`).
  * Gestion du panier, sélection des options obligatoires/facultatives, calcul des pourboires et TVA locale.
  * Déclenchement de la modale de passerelle de paiement sécurisée (**Apple Pay / Google Pay / Carte NAPS 3D-Secure**).
  * Contrôle anti-fraude d'horaires d'ouverture (Kill-Switch).
* **`/order/[instance]/success`** :
  * Page de confirmation de paiement et de suivi de commande en direct.
  * Tracker à 4 étapes en temps réel (Reçue ➔ En préparation ➔ Prête ➔ Servie).
  * Reçu fiscal électronique détaillé et modal de téléchargement de Facture PDF imprimable.
  * Liens d'incitation vers la Roue de la Fortune (`/spin/[instance]`) et la carte de fidélité.
* **`/spin/[instance]`** :
  * Portail Lifestyle & Roue de la Fortune VIP.
  * Grille de services : Commande à table, Scan Nutritionnel **Eat&Fit**, Mot de passe Wi-Fi et Fidélité VIP.
* **`/card/[phone]`** :
  * Carte de fidélité digitale interactive (Tampons de fidélité, offres VIP et historique).

### 👨‍🍳 3.2. Routes Opérationnelles & Restauration
* **`/kitchen/[instance]`** :
  * Écran Cuisine KDS (Kitchen Display System) et Console Manager.
  * Écran de verrouillage sécurisé par code PIN (clavier tactile virtuel ou saisie physique).
  * Tableau Kanban des bons de commande triés par heure d'arrivée avec timer d'attente dynamique (`XX min`).
  * Carillon sonore automatique à chaque nouvelle commande entrante.
  * Bandeau de statistiques financières en direct : Chiffre d'Affaires, volume de commandes, panier moyen, répartition des modes de règlement.
  * Filtres par table, filtres de période (*Today, Last 7 Days, This Month, All Time*) et sélecteur de calendrier.
  * **Exportateur comptable 1 clic** en fichier CSV / Excel structuré.
* **`/qr-generator/[instance]`** :
  * Studio d'impression de chevalets de table.
  * Générateur par lot (de 1 à 60 tables) avec QR codes aux couleurs du restaurant et logo intégré.
  * Export en archive ZIP (`.zip`) de tous les PNGs 800x800px et mode planche A4 prêt à imprimer.
* **`/cashier/[instance]`** :
  * Terminal d'encaissement et de validation des tampons de fidélité.

---

## 4. Architecture des APIs & Logique Backend

### 📡 4.1. Route `GET /api/menu`
* **Rôle** : Récupère la configuration globale du restaurant et la liste complète des plats/boissons actifs.
* **Paramètres** : `?instance=bos_cafe_moq`
* **Logique Métier** :
  1. Interroge la table NocoDB `Restaurants` pour récupérer l'identité graphique, les horaires d'ouverture (`opening_time`, `closing_time`), le fuseau horaire (`timezone`) et le commutateur d'urgence (`is_accepting_orders`).
  2. Calcule le statut dynamique du magasin :
     ```typescript
     isOpen: boolean; // True si l'heure locale se situe dans la plage d'ouverture ET is_accepting_orders === true
     openingTime: string;
     closingTime: string;
     currentTime: string;
     ```
  3. Interroge la table NocoDB `menu_Items` filtrée sur `is_available = true` et regroupe les plats par catégorie.

---

### 📡 4.2. Route `POST & GET & PATCH /api/orders`
* **`POST` (Création de commande)** :
  1. Vérification serveur obligatoire des horaires d'ouverture via `verifyStoreIsOpen(instance)`. Si le restaurant est fermé ou le kill-switch activé ➔ Rejet immédiat avec code **HTTP 403 `STORE_CLOSED`**.
  2. Génération d'un identifiant unique `SR-XXXXXX`.
  3. Sauvegarde immédiate dans la table NocoDB `Orders` (`mni5io8ofzftnc4`).
  4. Sauvegarde miroir dans le stockage persistant local serveur pour affichage KDS instantané (zéro latence réseau).
* **`GET` (Lecture des commandes pour KDS et Suivi Client)** :
  * `?orderId=SR-190154` : Retourne l'état précis d'une commande (utilisé par le smartphone du client).
  * `?instance=bos_cafe_moq` : Retourne toutes les commandes de l'établissement fusionnées entre NocoDB et le cache local (dédupliquées par `order_id`).
* **`PATCH` (Mise à jour du statut par la cuisine)** :
  * Reçoit `{ order_id, status, instance }`.
  * Met à jour le statut dans NocoDB et propage l'événement vers tous les terminaux connectés.

---

### 📡 4.3. Route `POST /api/auth/kitchen`
* **Rôle** : Vérification sécurisée du code PIN de l'écran cuisine.
* **Paramètres** : `{ instance: "bos_cafe_moq", pin: "2030" }`
* **Sécurité** :
  * Interroge NocoDB pour valider le code PIN associé à l'instance (ou fallback PIN par défaut `2030`).
  * Pose un cookie de session HttpOnly `kds_session` pour maintenir la session active sur la tablette cuisine.

---

## 5. Modèle de Données NocoDB & Schémas des Tables

Base de Données NocoDB : `paqp4j28hftb5ji`

```
┌────────────────────────────────┐         ┌────────────────────────────────┐
│          Restaurants           │         │           menu_Items           │
│         (mnq99g2rb63ja4i)      │         │        (mo1b63dokvbmjyg)       │
├────────────────────────────────┤         ├────────────────────────────────┤
│ instance_name (PK)             │1       *│ item_id (PK)                   │
│ restaurant_name                ├─────────┤ instance_name (FK)             │
│ city, country                  │         │ name_ar, name_en, name_fr      │
│ primary_color, accent_color    │         │ description_ar, en, fr         │
│ logo_url, cover_image          │         │ price, calories, category_id   │
│ is_accepting_orders (boolean)  │         │ is_available, options_json     │
│ opening_time, closing_time     │         └────────────────────────────────┘
│ timezone (Asia/Qatar)          │
│ kitchen_pin                    │1
│ payment_provider, public_key   │
└───────────────┬────────────────┘
                │
                │1
                │
                │*
┌───────────────┴────────────────┐
│             Orders             │
│        (mni5io8ofzftnc4)       │
├────────────────────────────────┤
│ Id (PK auto)                   │
│ order_id (SR-XXXXXX)           │
│ instance_name (FK)             │
│ table_number (ex: "11")        │
│ customer_name                  │
│ customer_phone                 │
│ customer_email                 │
│ items_json (Détail plats)      │
│ currency ("QAR", "SAR", "EUR") │
│ total_amount (DECIMAL)         │
│ payment_method ("apple_pay")   │
│ status ("recue"..."servie")    │
│ CreatedAt (TIMESTAMP)          │
└────────────────────────────────┘
```

---

## 6. Flux Métier & Diagrammes Séquentiels

### 6.1. Flux de Commande & Paiement Dématérialisé (Apple Pay / 3DS)

```
Client (Mobile)               Serveur Next.js               Passerelle Bancaire         Cuisine KDS
     │                              │                                │                       │
     │── 1. Scan QR (Table 11) ────>│                                │                       │
     │<── 2. Menu + Statut Ouvert ──│                                │                       │
     │                              │                                │                       │
     │── 3. Panier + Apple Pay ────>│                                │                       │
     │<── 4. Déclenche Sheet ───────│                                │                       │
     │                              │                                │                       │
     │── 5. Biométrie Face ID ──────────────────────────────────────>│                       │
     │<── 6. Token 3DS Approuvé ─────────────────────────────────────│                       │
     │                              │                                │                       │
     │── 7. POST /api/orders ──────>│                                │                       │
     │   (Vérif Horaires + Token)   │── 8. Save NocoDB Orders ──────>│                       │
     │                              │── 9. Émission Broadcast ──────────────────────────────>│
     │<── 10. Redirection /success ─│                                │                       │ 10. Carillon 🔔
     │    (Reçu Digital + PDF)      │                                │                       │    + Ticket Table 11
```

---

### 6.2. Flux Cuisine KDS & Synchronisation Multi-Écrans

```
Cuisine (Tablette)            Serveur Next.js API            NocoDB Orders         Client (Mobile)
     │                                │                            │                      │
     │── 1. Saisie PIN "2030" ───────>│                            │                      │
     │<── 2. Session KDS Validée ─────│                            │                      │
     │                                │                            │                      │
     │── 3. Clic "👨‍🍳 Start Cooking" ─>│                            │                      │
     │    (PATCH status: en_cuisine)  │── 4. Update NocoDB ───────>│                      │
     │                                │                            │                      │
     │                                │<── 5. Polling 3s ─────────────────────────────────│
     │                                │─── 6. Statut: "En cuisine" ──────────────────────>│
     │                                │                            │                      │ (Progression barre)
```

---

### 6.3. Flux Eat&Fit : Vision IA & Génération Sportive

```
Client (Mobile)                 Landing Page                   n8n Webhook             Modèle Vision IA
     │                               │                              │                          │
     │── 1. Photo Plat + Niveau ────>│                              │                          │
     │                               │── 2. POST /ai-food-vision ──>│                          │
     │                               │                              │── 3. Analyse Calorique ─>│
     │                               │                              │<── 4. Macro-nutriments ──│
     │                               │                              │                          │
     │                               │                              │── 5. Prompt Fitness ────>│
     │                               │                              │<── 6. Séance 12 min ─────│
     │                               │                              │                          │
     │                               │                              │── 7. Envoi WhatsApp ────> Client
     │                               │<── 8. Résultat Écran ────────│                          │
```

---

## 7. Sécurité, Conformité & Haute Disponibilité

1. **Sécurité Bancaire (Norme PCI-DSS Niveau 1 & 3DS2)** :
   * Ni les serveurs de l'application, ni NocoDB ne stockent de numéro de carte bancaire.
   * Chiffrement TLS 256-bit de bout en bout.
   * Authentification forte biométrique (Apple Pay Face ID / Touch ID) ou défi OTP SMS bancaire obligatoire.
2. **Protection Anti-Fraude d'Horaires (Double Contrôle Client & Serveur)** :
   * Même si un utilisateur tente de manipuler le code JavaScript client, l'API `/api/orders` ré-exécute la vérification horaire côté serveur avant d'accepter toute transaction.
3. **Résilience et Mode Dégradé (Fallback Haute Disponibilité)** :
   * En cas de latence ou d'indisponibilité momentanée du réseau externe NocoDB, l'application bascule automatiquement sur un cache JSON local persistant pour garantir que les commandes de la cuisine ne soient **jamais perdues**.
4. **Verrouillage KDS (Sécurité Personnel)** :
   * L'accès aux commandes et aux données financières du restaurant est protégé par code PIN avec hashage et temporisation contre les attaques par force brute.

---

## 8. Internationalisation & Localisation (i18n)

L'architecture supporte nativement le multilinguisme avec bascule dynamique de direction de lecture (**RTL pour l'Arabe**, **LTR pour l'Anglais et le Français**) :
* **Auto-détection intelligente** : Lecture de `navigator.language` au premier contact.
* **Persistance globale** : Mémorisation dans `localStorage.getItem('user_lang')` et `localStorage.getItem('kds_lang')`.
* **Continuité de parcours** : La langue sélectionnée sur la page de commande est passée dans les paramètres de redirection (`?lang=en`) garantissant que la page de confirmation, le reçu et la facture PDF restent dans la langue du client.
* **Formatage des Devises** : Adapté aux normes locales (`QAR` / `ر.ق` au Qatar, `SAR` / `ر.س` en Arabie Saoudite, `EUR` / `€` en Europe).

---

## 9. Déploiement, Hébergement & Procédure d'Exploitation

### Environnement Serveur Hostinger (Production) :
* **Serveur** : VPS Ubuntu Linux (`srv821341.hstgr.cloud`).
* **Gestionnaire de Processus** : **PM2** (Cluster Node.js redémarrage automatique en cas de panne).
* **Reverse Proxy** : **Nginx** avec certificats SSL Let's Encrypt auto-renouvelés.
* **Dépôt Git** : `https://github.com/hellomycoach/smart-review-v4-lifestyle-vision2030.git` (Branche `main`).

### Commandes Standards de Mise à Jour (Déploiement en 30 secondes) :
```bash
# 1. Se connecter au dossier du projet sur le serveur
cd /var/www/smart-review-v4-lifestyle-vision2030

# 2. Récupérer le code validé depuis GitHub
git pull origin main

# 3. Compiler la version de production Next.js
npm run build

# 4. Redémarrer le service PM2 sans interruption
pm2 restart all
```

---

## 10. Guide d'Onboarding d'un Nouveau Restaurant

Pour ajouter un nouvel établissement (ex: `le_parisien_doha`) sur la plateforme, **aucune modification de code n'est nécessaire** :

1. **Création dans NocoDB (Table `Restaurants`)** :
   * Ajouter une ligne avec :
     * `instance_name` : `le_parisien_doha`
     * `restaurant_name` : `Le Parisien Café`
     * `primary_color` : Code HEX (ex: `#1A2B4C`)
     * `opening_time` : `08:00` / `closing_time` : `23:00`
     * `timezone` : `Asia/Qatar`
     * `is_accepting_orders` : `true`
     * `kitchen_pin` : `2030`
2. **Ajout des Plats (Table `menu_Items`)** :
   * Insérer les plats avec `instance_name = le_parisien_doha`, prix, photos et catégories.
3. **Génération Immédiate des Supports** :
   * Accéder à `https://[domaine]/qr-generator/le_parisien_doha`.
   * Sélectionner le nombre de tables et télécharger le pack de chevalets de table prêt pour l'imprimeur !
4. **Mise à Disposition de la Cuisine** :
   * Installer la tablette cuisine sur `https://[domaine]/kitchen/le_parisien_doha`.
   * Les commandes sont immédiatement opérationnelles !
