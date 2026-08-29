# 📋 Roadmap & Architecture : Smart Review v5.0 (Table Ordering & Online Payment)

Ce document récapitule l'ensemble des spécifications et de l'architecture convenues pour l'implémentation de la fonctionnalité de commande et paiement à table.

---

## 🎯 Objectifs de la Version 5.0

1. **Commande à table via QR Code** : Chaque table possède son propre QR code avec numéro de table dynamique (ex: `/order/halim_cafe?table=07`).
2. **Menu interactif & Panier** : Sélection des plats, déclinaisons/suppléments, calcul en temps réel (TTC/TVA).
3. **Paiement en ligne sécurisé** : Support natif d'Apple Pay, Mada (KSA), NAPS (Qatar) et cartes bancaires.
4. **Impression automatique du ticket** :
   - **Option A (POS API)** : Connexion directe aux logiciels de caisse leaders (ex: **Foodics** pour KSA & Qatar).
   - **Option B (Universal Thermal Print)** : Connexion directe aux imprimantes thermiques (ESC/POS, Epson ePOS, PrintNode) pour fonctionner avec n'importe quelle caisse.

---

## 🏗️ Architecture Technique Prévue

### 1. Isolation & Sécurité du Code
* Développement sur une branche dédiée : `feature/table-ordering-v5`.
* Aucune modification des routes actuelles (`/spin/[instance]`, `/card/[phone]`, `/cashier/[instance]`).

### 2. Nouvelles Routes Next.js (App Router)
* `app/order/[instance]/page.tsx` : Page client (Menu, choix des plats, panier, validation commande).
* `app/order/[instance]/success/page.tsx` : Page de confirmation de paiement et reçu digital.

### 3. Passerelles de Paiement
* **Golfe (KSA 🇸🇦 / Qatar 🇶🇦)** : **Tap Payments** ou **Moyasar** (Support natif Mada, NAPS, Apple Pay).
* **France 🇫🇷 / International** : **Stripe**.

### 4. Automatisation n8n & NocoDB
* **NocoDB** : Nouvelles tables `Orders`, `Order_Items`, `Tables_Config`.
* **n8n Webhook** : Réception du paiement validé -> Enregistrement NocoDB -> Déclenchement de l'impression / API Foodics -> Notification WhatsApp optionnelle.

---

*Fichier créé automatiquement pour conserver l'état d'avancement et reprendre immédiatement le développement.*
