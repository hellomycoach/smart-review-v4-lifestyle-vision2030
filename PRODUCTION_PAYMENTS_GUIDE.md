# 🚀 FEUILLE DE ROUTE DE PRODUCTION : PAIEMENT EN LIGNE & WALLETS (APPLE PAY / GOOGLE PAY)

Ce document détaille l'intégralité du processus de passage en production pour le paiement par QR code à table (Apple Pay, Google Pay, Cartes Bancaires locales NAPS / Mada / Visa / Mastercard) pour un restaurant partenaire (ex: Bo's Coffee, Doha Pilot, etc.).

---

## 🎯 1. Vue d'Ensemble de l'Architecture Financière

```
     ┌────────────────────────────────────────────────────────┐
     │           SMARTPHONE DU CLIENT (À TABLE)               │
     │      Scan QR Code Table -> Sélection des Plats         │
     └──────────────────────────┬─────────────────────────────┘
                                │
             Choix du mode de règlement à table :
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  APPLE PAY   /  GOOGLE PAY  │        │   CARTE BANCAIRE (NAPS/MADA) │
│  Biométrie Face ID / Touch   │        │   3D-Secure SMS OTP Banque   │
└──────────────┬───────────────┘        └──────────────┬───────────────┘
               │                                       │
               └───────────────────┬───────────────────┘
                                   │
                                   ▼
          ┌─────────────────────────────────────────────────┐
          │     PASSERELLE AGRÉÉE (Tap Payments / SkipCash) │
          │        Sécurité Bancaire PCI-DSS Niveau 1       │
          └────────────────────────┬────────────────────────┘
                                   │
       ┌───────────────────────────┴───────────────────────────┐
       ▼                                                       ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│     CONFIRMATION INSTANTANÉE │        │       VIREMENTS BANCAIRES    │
│  - Ticket envoyé en Cuisine  │        │  Fonds virés directement sur │
│  - Reçu digital au client    │        │  le compte bancaire du resto │
│  - Dashboard Manager mis à j │        │  (QNB, CBQ, Al Rajhi, etc.)  │
└──────────────────────────────┘        └──────────────────────────────┘
```

---

## 📱 2. Apple Pay vs Google Pay : Comment ça fonctionne concrètement ?

### Est-ce identique à Apple Pay ?
**OUI, le principe utilisateur et technique est rigoureusement identique :**
* **Sur iPhone / iPad / Mac (Safari) :** Le système propose automatiquement **Apple Pay**  avec validation par **Face ID / Touch ID**.
* **Sur smartphone Android (Chrome, Samsung, Xiaomi) :** Le système propose automatiquement **Google Pay (GPay)** avec validation par empreinte digitale ou code du téléphone.
* **Le point fort des passerelles modernes (Tap Payments / Stripe) :**  
  Elles intègrent un bouton intelligent unifié :
  * Si l'appareil est un iPhone ➔ Affiche le bouton **Apple Pay**.
  * Si l'appareil est un Android ➔ Affiche le bouton **Google Pay**.
  * Zéro formulaire à remplir pour le client, la carte est déjà enregistrée dans le wallet de son téléphone !

---

## 🏢 3. Les 4 Étapes Concrètes de Mise en Production (Guide pour le Restaurateur)

### Étape 1 : Ouverture du Compte Marchand (Délai : 24h à 48h)
Le restaurant s'inscrit en ligne auprès de la passerelle de paiement officielle de son pays :
* **Qatar 🇶🇦 & Golfe (KSA 🇸🇦, EAU 🇦🇪) :** **Tap Payments** (`tap.company`) ou **SkipCash** (`skipcash.com`).
* **International / Europe 🇫🇷 :** **Stripe** (`stripe.com`).

**Documents requis pour le dossier de conformité (KYC) :**
1. **Commercial Registration (CR)** : Registre du commerce du restaurant.
2. **QID / ID du Signataire Autorisé** : Pièce d'identité du gérant.
3. **Certificat IBAN / RIB Officiel** : Document de la banque du restaurant (ex: Qatar National Bank, Commercial Bank of Qatar) où seront virées les recettes des ventes.
4. **Trade License / Baladiya** : Autorisation municipale d'exercice commercial.

---

### Étape 2 : Validation Apple Pay & Google Pay sur le Domaine

1. **Agrément Apple Pay (Domain Association) :**
   * Apple exige qu'un fichier de vérification cryptographique soit déposé sur le nom de domaine du restaurant ou de l'application :
     `https://[domaine]/.well-known/apple-developer-merchantid-domain-association`
   * Ce fichier est fourni en 1 clic dans le tableau de bord de la passerelle (Tap / Stripe) et reste valable indéfiniment.
2. **Agrément Google Pay :**
   * Google Pay s'active instantanément sans fichier additionnel dès que le compte marchand est certifié.

---

### Étape 3 : Récupération des Clés d'API Live (Production)

Dans son espace marchand, le gérant ou directeur financier accède à l'onglet **API & Intégrations** et récupère deux clés :
* **`Live Public Key`** (Clé Publique) : ex. `pk_live_xxxxxxxxxxxxxxxxxxxx`
* **`Live Secret Key`** (Clé Secrète) : ex. `sk_live_xxxxxxxxxxxxxxxxxxxx`

---

### Étape 4 : Configuration dans NocoDB (Zéro Ligne de Code à Redéployer)

Grâce à l'architecture multi-restaurants de Smart Review v5, chaque restaurant est indépendant. Dans la table NocoDB `Restaurants` :
* Colonne `payment_provider` : `"tap"`
* Colonne `payment_public_key` : `pk_live_xxxxxxxxxxxx`
* Colonne `payment_secret_key` : `sk_live_xxxxxxxxxxxx`
* Colonne `payment_currency` : `"QAR"` (ou `"SAR"`, `"EUR"`)

Le restaurant est immédiatement opérationnel sur toutes ses tables !

---

## 💰 4. Circuit Financier & Gestion Comptable

| Question du Directeur Financier | Réponse Commerciale & Technique |
| :--- | :--- |
| **Où va l'argent payé par le client ?** | L'argent est crédité sur le compte marchand du restaurant auprès de la passerelle, puis transféré automatiquement par virement bancaire sur le compte bancaire de la société du restaurant. **Smart Review n'est jamais intermédiaire et ne touche jamais aux fonds.** |
| **Quelle est la fréquence des virements ?** | Les virements (Payouts) s'effectuent automatiquement tous les jours ou toutes les 48 heures ouvrées selon le choix du restaurant. |
| **Quels sont les frais bancaires ?** | Les frais sont les taux interbancaires standards négociés par le restaurant (environ 1.5% à 2.2% + 1 QAR par transaction carte/wallet). |
| **Comment se passe la comptabilité ?** | Chaque transaction possède un identifiant unique (`SR-XXXXXX`) lié au numéro de table, à la facture PDF du client et au virement bancaire. Export comptable Excel/CSV disponible en 1 clic dans NocoDB et sur le portail bancaire. |

---

## 🛡️ 5. Sécurité & Conformité Réglementaire

* **Norme PCI-DSS Niveau 1** : Norme de sécurité la plus élevée de l'industrie des cartes de paiement.
* **Zéro Stockage de Coordonnées Bancaires** : Ni l'application, ni les serveurs Smart Review ne voient ou ne conservent de numéro de carte de crédit.
* **Authentification Forte 3D-Secure 2.0 (3DS2)** : Vérification biométrique (Face ID) ou SMS OTP obligatoire, protégeant le restaurant contre 100% des contestations ou fraudes de paiement.
