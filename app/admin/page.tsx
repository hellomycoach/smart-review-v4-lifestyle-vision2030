'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Star, MessageSquare, AlertTriangle, Gift, Phone, CheckCircle, 
  Sun, Moon, Globe, RefreshCw, Check, LogOut, Lock, Mail, Eye, EyeOff,
  Users, Download, Wifi, Calendar, CreditCard, Award, ChevronDown, 
  Filter, Building2, Sparkles, ThumbsUp, ExternalLink, ArrowUpRight,
  TrendingUp, Clock
} from 'lucide-react';

// ================= ENDPOINTS N8N =================
const N8N_REVIEWS_API = "https://n8n.srv821341.hstgr.cloud/webhook/dashboard-data";
const N8N_LOGIN_API = "https://n8n.srv821341.hstgr.cloud/webhook/login-manager";
const N8N_RESTAURANTS_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-restaurants";
const N8N_UPDATE_REWARD_API = "https://n8n.srv821341.hstgr.cloud/webhook/update-reward-v2";
const N8N_LEADS_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-leads-v2";
const N8N_FIDELITE_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-fidelite-v3";
const N8N_COUPONS_API = "https://n8n.srv821341.hstgr.cloud/webhook/get-coupons-v3";

// Extraction propre des noms d'instances
const parseInstanceName = (raw: any): string => {
  if (!raw) return "";
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === 'string') return first.trim();
    if (typeof first === 'object' && first !== null) {
      return (first.instance_name || first.restaurant_name || first.title || "").trim();
    }
  }
  if (typeof raw === 'object' && raw !== null) {
    return (raw.instance_name || raw.restaurant_name || "").trim();
  }
  return "";
};

// Extraction de la clé de franchise pour isolation stricte
const getFranchiseKey = (instance: string): string => {
  const clean = parseInstanceName(instance).toLowerCase().trim();
  if (!clean) return "";
  
  if (clean.startsWith('bos_cafe') || clean.includes('bos')) return 'bos_cafe';
  if (clean.startsWith('bella_italia') || clean.includes('bella')) return 'bella_italia';
  if (clean.startsWith('barns')) return 'barns';
  if (clean.startsWith('halim')) return 'halim_cafe';
  if (clean.startsWith('riwaq') || clean.includes('qnl')) return 'riwaq';
  if (clean.startsWith('doha_pilot') || clean.includes('lusail')) return 'doha_pilot';
  if (clean.startsWith('smart_review') || clean.includes('elixir')) return 'smart_review_ksa';
  
  const parts = clean.split('_');
  return parts.length > 1 ? `${parts[0]}_${parts[1]}` : parts[0];
};

// Vérifie si une instance correspond à un filtre (exact ou franchise)
const isInstanceMatch = (itemInstance: string, targetInstance: string, targetFranchise?: string): boolean => {
  const cleanItem = parseInstanceName(itemInstance).toLowerCase().trim();
  const cleanTarget = parseInstanceName(targetInstance).toLowerCase().trim();
  
  if (!cleanItem) return false;
  if (cleanTarget && cleanItem === cleanTarget) return true;
  
  if (targetFranchise) {
    return getFranchiseKey(cleanItem) === targetFranchise;
  }
  return cleanItem.includes(cleanTarget) || cleanTarget.includes(cleanItem);
};

// Types de filtres temporels
type DateFilterKey = 'today' | '7d' | '30d' | 'month' | 'all' | 'custom';

export default function SmartReviewDashboard() {
  // Session Utilisateur
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Thème, Langue & Onglets
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lang, setLang] = useState<'fr' | 'ar' | 'en'>('en');
  const [activeTab, setActiveTab] = useState<'reviews' | 'loyalty' | 'leads'>('reviews');
  const [loading, setLoading] = useState(false);

  // Données Brutes
  const [allRestaurants, setAllRestaurants] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>('all_franchise');
  const [rawReviews, setRawReviews] = useState<any[]>([]);
  const [rawLoyalty, setRawLoyalty] = useState<any[]>([]);
  const [rawCoupons, setRawCoupons] = useState<any[]>([]);
  const [rawLeads, setRawLeads] = useState<any[]>([]);

  // Filtres Temporels
  const [dateFilter, setDateFilter] = useState<DateFilterKey>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Filtres spécifiques avis
  const [ratingFilter, setRatingFilter] = useState<'all' | 'positive' | 'negative' | '5' | '4' | '3' | '2' | '1'>('all');

  // Gestion des avis négatifs résolus
  const [resolvedIssues, setResolvedIssues] = useState<number[]>([]);

  // Gestion de l'offre récompense
  const [rewardOffer, setRewardOffer] = useState('');
  const [newReward, setNewReward] = useState('');
  const [isUpdatingReward, setIsUpdatingReward] = useState(false);

  // Dictionnaire Trilingue Complet
  const t = useMemo(() => {
    const dict = {
      fr: {
        brandSub: "Plateforme Managériale Vision 2030",
        loginTitle: "Espace Gérant & Franchise",
        loginDesc: "Connectez-vous pour piloter vos avis, fidélité et clients",
        email: "Adresse Email",
        password: "Mot de passe",
        loginBtn: "Se connecter au Dashboard",
        logout: "Déconnexion",
        tabReviews: "Avis & E-Réputation",
        tabLoyalty: "Cartes de Fidélité & VIP",
        tabLeads: "Contacts & Leads Wi-Fi",
        periodLabel: "Période :",
        periodToday: "Aujourd'hui",
        period7d: "7 derniers jours",
        period30d: "30 jours",
        periodMonth: "Ce mois-ci",
        periodAll: "Tout l'historique",
        periodCustom: "Personnalisé",
        kpiReviews: "Avis Récoltés",
        kpiRating: "Note Moyenne",
        kpiSatisfaction: "Satisfaction Client",
        kpiGoogleReviews: "Avis 4-5★ Google",
        kpiNegativeAlerts: "Avis Négatifs Interceptés",
        kpiCardsTotal: "Cartes Fidélité Actives",
        kpiCardsCompleted: "Paliers 10/10 VIP",
        kpiCardsProgress: "Cartes en Cours (1-9)",
        kpiVisits: "Visites Cumulées",
        kpiLeads: "Contacts Enregistrés",
        negativeAlertTitle: "Centre d'Interception des Insatisfactions (Alerte Immédiate)",
        callClient: "Appeler le client",
        markResolved: "Marquer comme traité",
        resolved: "Traité ✓",
        feedTitle: "Flux des Avis Clients",
        exportCSV: "Exporter CSV",
        rewardTitle: "Offre Cadeau Active",
        rewardDesc: "Récompense offerte aux clients satisfaits",
        rewardBtn: "Mettre à jour",
        noReviews: "Aucun avis enregistré sur la période sélectionnée.",
        noLoyalty: "Aucune carte de fidélité active sur cette période.",
        noLeads: "Aucun lead Wi-Fi capturé sur cette période.",
        stampsProgress: "Progression des tampons",
        visits: "visites",
        allRatings: "Toutes les notes",
        positiveOnly: "Avis Positifs (4-5★)",
        negativeOnly: "Avis Négatifs (1-3★)",
        allMyBranches: (c: number) => `Toutes mes branches (${c})`,
        allBrandsAdmin: "Toutes les enseignes (Super Admin)",
        myFranchise: "Ma Franchise",
        allBranchesText: "Toutes les branches",
        refreshTooltip: "Actualiser les données",
        overPeriod: "Sur la période",
        globalExcellence: "Excellence globale",
        positiveReviewsText: "avis positifs",
        publishedToGoogle: "Publiés vers Google Maps",
        privatelyIntercepted: "Interceptés en privé",
        negativeAlertDesc: (c: number) => `${c} client(s) insatisfait(s) intercepté(s) avant toute publication publique sur Google Maps.`,
        actionRequired: "Action Requise",
        interceptedAlert: "Alerte Interceptée",
        recent: "Récemment",
        clientLabel: "Client :",
        notSpecified: "Non renseigné",
        googleReviewBadge: "Google Review ✓",
        privateInterceptBadge: "Interception Privée",
        telLabel: "Tél :",
        branchLabel: "Branche :",
        currentRewardTitle: "CADEAU ACTUEL",
        rewardPlaceholder: "Ex: 1 Cookie ou Boisson offerte 🍪",
        impactRateTitle: "Taux d'impact Smart Review",
        positiveValuedGoogle: "Avis positifs valorisés sur Google :",
        negativeContained: "Avis négatifs étouffés en interne :",
        cardHolders: "Clients porteurs d'une carte",
        inProgressPts: "En cours de cumul (1-9 pts)",
        rewardUnlocked: "Récompense VIP débloquée",
        recordedVisits: "Passages enregistrés",
        digitalCardsList: (c: number) => `Liste des Cartes Digitales (${c})`,
        thClientPhone: "Client / Téléphone",
        thBranch: "Branche",
        thProgression: "Progression Tampons (10 pts)",
        thVisits: "Visites",
        thAiScans: "Scans IA",
        thEmail: "Email",
        thDateCreated: "Date Création",
        optInPhoneNumbers: "Numéros opt-in conformes",
        mainSource: "Source Principale",
        captivePortal: "Portail Captif Wi-Fi & QR",
        internetGiftWheel: "Accès Internet + Roue Cadeau",
        crmMarketingExport: "Export CRM Marketing",
        downloadCsv: "Télécharger la base CSV",
        readyForBroadcast: "Prêt pour WhatsApp Broadcast & SMS",
        capturedContactsBase: (c: number) => `Base Contacts Capturés (${c})`,
        thPhoneNumber: "Numéro de Téléphone",
        thBranchEstablishment: "Branche / Établissement",
        thSource: "Source",
        thCaptureDate: "Date de Capture",
        franchiseLabel: "Franchise",
        defaultRewardOffer: "1 Café ou Cookie offert ☕",
        defaultReviewText: "Avis client enregistré",
        loginErrorCreds: "Email ou mot de passe incorrect",
        loginErrorServer: "Erreur de connexion au serveur"
      },
      en: {
        brandSub: "Vision 2030 Management Suite",
        loginTitle: "Manager & Franchise Portal",
        loginDesc: "Sign in to monitor customer reviews, loyalty cards, and leads",
        email: "Email Address",
        password: "Password",
        loginBtn: "Sign In to Dashboard",
        logout: "Log Out",
        tabReviews: "Reviews & Reputation",
        tabLoyalty: "Digital Loyalty Cards",
        tabLeads: "Wi-Fi Leads & CRM",
        periodLabel: "Period:",
        periodToday: "Today",
        period7d: "Last 7 days",
        period30d: "Last 30 days",
        periodMonth: "This Month",
        periodAll: "All Time",
        periodCustom: "Custom Range",
        kpiReviews: "Total Reviews",
        kpiRating: "Average Rating",
        kpiSatisfaction: "Customer Satisfaction",
        kpiGoogleReviews: "4-5★ Google Reviews",
        kpiNegativeAlerts: "Intercepted Negative Reviews",
        kpiCardsTotal: "Active Loyalty Cards",
        kpiCardsCompleted: "Completed 10/10 VIPs",
        kpiCardsProgress: "In-Progress Cards (1-9)",
        kpiVisits: "Total Visits",
        kpiLeads: "Captured Leads",
        negativeAlertTitle: "Negative Feedback Interception Hub (Action Required)",
        callClient: "Call Customer",
        markResolved: "Mark as Resolved",
        resolved: "Resolved ✓",
        feedTitle: "Customer Reviews Stream",
        exportCSV: "Export CSV",
        rewardTitle: "Active Reward Offer",
        rewardDesc: "Gift offered to satisfied customers",
        rewardBtn: "Update Offer",
        noReviews: "No reviews found for this selected timeframe.",
        noLoyalty: "No active loyalty cards in this period.",
        noLeads: "No Wi-Fi leads captured in this period.",
        stampsProgress: "Stamps Progress",
        visits: "visits",
        allRatings: "All Ratings",
        positiveOnly: "Positive Reviews (4-5★)",
        negativeOnly: "Negative Reviews (1-3★)",
        allMyBranches: (c: number) => `All my branches (${c})`,
        allBrandsAdmin: "All brands (Super Admin)",
        myFranchise: "My Franchise",
        allBranchesText: "All branches",
        refreshTooltip: "Refresh data",
        overPeriod: "Over selected period",
        globalExcellence: "Global excellence",
        positiveReviewsText: "positive reviews",
        publishedToGoogle: "Published to Google Maps",
        privatelyIntercepted: "Privately intercepted",
        negativeAlertDesc: (c: number) => `${c} dissatisfied customer(s) intercepted before any public review on Google Maps.`,
        actionRequired: "Action Required",
        interceptedAlert: "Intercepted Alert",
        recent: "Recent",
        clientLabel: "Customer:",
        notSpecified: "Not specified",
        googleReviewBadge: "Google Review ✓",
        privateInterceptBadge: "Private Intercept",
        telLabel: "Tel:",
        branchLabel: "Branch:",
        currentRewardTitle: "CURRENT REWARD",
        rewardPlaceholder: "Ex: 1 Free Cookie or Beverage 🍪",
        impactRateTitle: "Smart Review Impact Rate",
        positiveValuedGoogle: "Positive reviews boosted on Google:",
        negativeContained: "Negative feedback resolved internally:",
        cardHolders: "Active card holders",
        inProgressPts: "Collecting points (1-9 pts)",
        rewardUnlocked: "VIP Reward Unlocked",
        recordedVisits: "Logged customer visits",
        digitalCardsList: (c: number) => `Digital Loyalty Cards List (${c})`,
        thClientPhone: "Customer / Phone",
        thBranch: "Branch",
        thProgression: "Stamps Progress (10 pts)",
        thVisits: "Visits",
        thAiScans: "AI Scans",
        thEmail: "Email",
        thDateCreated: "Date Created",
        optInPhoneNumbers: "Compliant opt-in contacts",
        mainSource: "Primary Source",
        captivePortal: "Wi-Fi Portal & QR Code",
        internetGiftWheel: "Internet Access + Reward Wheel",
        crmMarketingExport: "Marketing CRM Export",
        downloadCsv: "Download CSV Database",
        readyForBroadcast: "Ready for WhatsApp Broadcast & SMS",
        capturedContactsBase: (c: number) => `Captured Contacts Database (${c})`,
        thPhoneNumber: "Phone Number",
        thBranchEstablishment: "Branch / Venue",
        thSource: "Source",
        thCaptureDate: "Capture Date",
        franchiseLabel: "Franchise",
        defaultRewardOffer: "1 Free Coffee or Cookie ☕",
        defaultReviewText: "Customer review recorded",
        loginErrorCreds: "Incorrect email or password",
        loginErrorServer: "Server connection error"
      },
      ar: {
        brandSub: "منصة إدارة المطاعم والمقاهي • رؤية 2030",
        loginTitle: "بوابة إدارة الفروع والامتيازات",
        loginDesc: "تسجيل الدخول لمتابعة تقييمات العملاء وبطاقات الولاء والعملاء المحتملين",
        email: "البريد الإلكتروني",
        password: "كلمة المرور",
        loginBtn: "تسجيل الدخول للوحة التحكم",
        logout: "تسجيل الخروج",
        tabReviews: "التقييمات والسمعة",
        tabLoyalty: "بطاقات الولاء والجوائز",
        tabLeads: "أرقام الواي فاي والتواصل",
        periodLabel: "الفترة:",
        periodToday: "اليوم",
        period7d: "آخر 7 أيام",
        period30d: "آخر 30 يوم",
        periodMonth: "هذا الشهر",
        periodAll: "كامل السجل",
        periodCustom: "فترة مخصصة",
        kpiReviews: "إجمالي التقييمات",
        kpiRating: "متوسط التقييم",
        kpiSatisfaction: "نسبة الرضا",
        kpiGoogleReviews: "تقييمات جوجل (4-5★)",
        kpiNegativeAlerts: "الشكاوى المعترضة (1-3★)",
        kpiCardsTotal: "بطاقات الولاء النشطة",
        kpiCardsCompleted: "أكملوا 10 نقاط VIP",
        kpiCardsProgress: "بطاقات جارية (1-9)",
        kpiVisits: "إجمالي الزيارات",
        kpiLeads: "الأرقام المسجلة",
        negativeAlertTitle: "مركز اعتراض الشكاوى والتقييمات السلبية (متابعة فورية)",
        callClient: "اتصال بالعميل",
        markResolved: "تحديد كمحلول",
        resolved: "تم الحل ✓",
        feedTitle: "سجل تقييمات العملاء",
        exportCSV: "تصدير CSV",
        rewardTitle: "العرض التشجيعي الحالي",
        rewardDesc: "الهدية المقدمة للعملاء الراضين",
        rewardBtn: "تحديث العرض",
        noReviews: "لا توجد تقييمات في الفترة المحددة.",
        noLoyalty: "لا توجد بطاقات ولاء في هذه الفترة.",
        noLeads: "لا توجد أرقام واي فاي مسجلة في هذه الفترة.",
        stampsProgress: "تقدم النقاط",
        visits: "زيارات",
        allRatings: "جميع التقييمات",
        positiveOnly: "التقييمات الإيجابية (4-5★)",
        negativeOnly: "الشكاوى السلبية (1-3★)",
        allMyBranches: (c: number) => `جميع فروعي (${c})`,
        allBrandsAdmin: "جميع العلامات (المشرف العام)",
        myFranchise: "امتيازي",
        allBranchesText: "جميع الفروع",
        refreshTooltip: "تحديث البيانات",
        overPeriod: "خلال الفترة المحددة",
        globalExcellence: "تميز إجمالي",
        positiveReviewsText: "تقييمات إيجابية",
        publishedToGoogle: "منشور على خرائط جوجل",
        privatelyIntercepted: "معترض داخلياً",
        negativeAlertDesc: (c: number) => `${c} عميل غير راضٍ تم اعتراضهم قبل نشر أي تقييم سلبي على جوجل.`,
        actionRequired: "إجراء مطلوب",
        interceptedAlert: "تنبيه معترض",
        recent: "مؤخراً",
        clientLabel: "العميل:",
        notSpecified: "غير متوفر",
        googleReviewBadge: "تقييم جوجل ✓",
        privateInterceptBadge: "اعتراض داخلي",
        telLabel: "الهاتف:",
        branchLabel: "الفرع:",
        currentRewardTitle: "الهدية الحالية",
        rewardPlaceholder: "مثال: قهوة أو كوكيز مجاني 🍪",
        impactRateTitle: "معدل تأثير سمارت ريفيو",
        positiveValuedGoogle: "تقييمات إيجابية معززة على جوجل:",
        negativeContained: "شكاوى سلبية تمت معالجتها داخلياً:",
        cardHolders: "حاملو بطاقات الولاء",
        inProgressPts: "جارٍ جمع النقاط (1-9 نقاط)",
        rewardUnlocked: "مكافأة VIP مفتوحة",
        recordedVisits: "زيارات مسجلة",
        digitalCardsList: (c: number) => `قائمة بطاقات الولاء الرقمية (${c})`,
        thClientPhone: "العميل / الهاتف",
        thBranch: "الفرع",
        thProgression: "تقدم النقاط (10 نقاط)",
        thVisits: "الزيارات",
        thAiScans: "مسحات الذكاء الاصطناعي",
        thEmail: "البريد الإلكتروني",
        thDateCreated: "تاريخ الإنشاء",
        optInPhoneNumbers: "أرقام مؤكدة الموافقة",
        mainSource: "المصدر الرئيسي",
        captivePortal: "بوابة الواي فاي ورمز QR",
        internetGiftWheel: "اتصال إنترنت + عجلة الجوائز",
        crmMarketingExport: "تصدير إدارة علاقات العملاء",
        downloadCsv: "تحميل قاعدة بيانات CSV",
        readyForBroadcast: "جاهز لحملات الواتساب والرسائل",
        capturedContactsBase: (c: number) => `قاعدة بيانات جهات الاتصال (${c})`,
        thPhoneNumber: "رقم الهاتف",
        thBranchEstablishment: "الفرع / المنشأة",
        thSource: "المصدر",
        thCaptureDate: "تاريخ التسجيل",
        franchiseLabel: "الامتياز",
        defaultRewardOffer: "قهوة أو كوكيز مجاني ☕",
        defaultReviewText: "تم تسجيل تقييم العميل",
        loginErrorCreds: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        loginErrorServer: "خطأ في الاتصال بالخادم"
      }
    };
    return dict[lang] || dict.en;
  }, [lang]);

  // Langue persistée
  const handleSetLang = (l: 'fr' | 'ar' | 'en') => {
    setLang(l);
    if (typeof window !== 'undefined') {
      localStorage.setItem('smart_review_lang', l);
    }
  };

  // Récupération sécurisée du texte de l'avis
  const getReviewText = (rev: any): string => {
    const gText = rev.google_review_text?.trim();
    const tText = rev.transcription?.trim();
    if (gText && gText.length > 0) return gText;
    if (tText && tText.length > 0) return tText;
    return t.defaultReviewText;
  };

  // Récompense affichée (traduite si par défaut)
  const displayRewardOffer = useMemo(() => {
    if (
      !rewardOffer ||
      rewardOffer === '1 Café ou Cookie offert ☕' ||
      rewardOffer === '1 Free Coffee or Cookie ☕' ||
      rewardOffer === 'قهوة أو كوكيز مجاني ☕'
    ) {
      return t.defaultRewardOffer;
    }
    return rewardOffer;
  }, [rewardOffer, t.defaultRewardOffer]);

  // 1. Restaurer la session locale et la langue au démarrage
  useEffect(() => {
    const savedLang = localStorage.getItem('smart_review_lang') as 'fr' | 'ar' | 'en';
    if (savedLang && ['fr', 'en', 'ar'].includes(savedLang)) {
      setLang(savedLang);
    }

    let savedUser = localStorage.getItem('smart_review_session_v4');
    if (!savedUser) {
      const oldSession = localStorage.getItem('smart_review_session_v2');
      if (oldSession) {
        savedUser = oldSession;
        localStorage.setItem('smart_review_session_v4', oldSession);
      }
    }
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setSelectedInstance(user.instance_name || 'all_franchise');
        fetchAllData(user);
      } catch (e) {
        localStorage.removeItem('smart_review_session_v4');
      }
    }
    const savedResolved = localStorage.getItem('smart_review_resolved_issues');
    if (savedResolved) {
      try {
        setResolvedIssues(JSON.parse(savedResolved));
      } catch (e) {}
    }
  }, []);

  // 2. Connexion Managériale Dynamique
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    try {
      const res = await fetch(N8N_LOGIN_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const raw = await res.json();
      const data = Array.isArray(raw) ? raw[0] : raw;

      if (data && data.success && data.user) {
        const instanceName = typeof data.user.instance_name === 'object'
          ? (data.user.instance_name.instance_name || data.user.instance_name.Id || "")
          : data.user.instance_name;

        const restaurantName = typeof data.user.restaurant_name === 'object'
          ? (data.user.restaurant_name.instance_name || data.user.restaurant_name.restaurant_name || instanceName)
          : (data.user.restaurant_name || instanceName);

        const sessionData = {
          email: data.user.email,
          instance_name: String(instanceName).trim(),
          restaurant_name: String(restaurantName).trim(),
          role: data.user.role || (cleanEmail.includes('jdaproai.com') ? 'admin' : 'manager')
        };

        setCurrentUser(sessionData);
        setSelectedInstance(sessionData.instance_name);
        localStorage.setItem('smart_review_session_v4', JSON.stringify(sessionData));
        await fetchAllData(sessionData);
      } else {
        setLoginError(data?.error || t.loginErrorCreds);
      }
    } catch (err) {
      setLoginError(t.loginErrorServer);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('smart_review_session_v4');
    localStorage.removeItem('smart_review_session_v2');
    setCurrentUser(null);
    setEmailInput('');
    setPasswordInput('');
    setAllRestaurants([]);
    setRawReviews([]);
    setRawLoyalty([]);
    setRawLeads([]);
  };

  // 3. Récupération globale de toutes les données avec tolérance aux pannes
  const fetchAllData = async (user = currentUser) => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Tenter la route interne Next.js directe vers NocoDB
      const directRes = await fetch('/api/dashboard/data', { cache: 'no-store' }).catch(() => null);
      if (directRes && directRes.ok) {
        const directData = await directRes.json();
        if (directData && directData.success) {
          if (Array.isArray(directData.reviews)) setRawReviews(directData.reviews);
          if (Array.isArray(directData.loyalty)) setRawLoyalty(directData.loyalty);
          if (Array.isArray(directData.coupons)) setRawCoupons(directData.coupons);
          if (Array.isArray(directData.leads)) setRawLeads(directData.leads);
          if (Array.isArray(directData.restaurants)) {
            setAllRestaurants(directData.restaurants);
            const currentMatch = directData.restaurants.find((r: any) => 
              parseInstanceName(r.instance_name).toLowerCase() === user.instance_name.toLowerCase()
            );
            if (currentMatch && currentMatch.reward_offer) {
              setRewardOffer(currentMatch.reward_offer);
            }
          }
          setLoading(false);
          return;
        }
      }

      // 2. Fallback vers les webhooks n8n si la route directe est indisponible
      const resRest = await fetch(N8N_RESTAURANTS_API).catch(() => null);
      if (resRest && resRest.ok) {
        const restJson = await resRest.json();
        const restList = Array.isArray(restJson) ? restJson : (restJson.list || []);
        setAllRestaurants(restList);

        const currentMatch = restList.find((r: any) => 
          parseInstanceName(r.instance_name).toLowerCase() === user.instance_name.toLowerCase()
        );
        if (currentMatch && currentMatch.reward_offer) {
          setRewardOffer(currentMatch.reward_offer);
        }
      }

      const resRev = await fetch(N8N_REVIEWS_API).catch(() => null);
      if (resRev && resRev.ok) {
        const revJson = await resRev.json();
        const list = Array.isArray(revJson) ? revJson : (revJson.list || []);
        setRawReviews(list);
      }

      const resFid = await fetch(N8N_FIDELITE_API).catch(() => null);
      if (resFid && resFid.ok) {
        const fidJson = await resFid.json();
        const list = Array.isArray(fidJson) ? fidJson : (fidJson.list || []);
        setRawLoyalty(list);
      }

      const resCoup = await fetch(N8N_COUPONS_API).catch(() => null);
      if (resCoup && resCoup.ok) {
        const coupJson = await resCoup.json();
        const list = Array.isArray(coupJson) ? coupJson : (coupJson.list || []);
        setRawCoupons(list);
      }

      const resLeads = await fetch(N8N_LEADS_API).catch(() => null);
      if (resLeads && resLeads.ok) {
        const leadsJson = await resLeads.json();
        const list = Array.isArray(leadsJson) ? leadsJson : (leadsJson.list || []);
        setRawLeads(list);
      }

    } catch (e) {
      console.error("Erreur lors de la synchronisation:", e);
    } finally {
      setLoading(false);
    }
  };

  // 4. Isolation stricte par Franchise (Multi-Store Cloisonné)
  const userFranchiseKey = useMemo(() => {
    return currentUser ? getFranchiseKey(currentUser.instance_name) : "";
  }, [currentUser]);

  const allowedRestaurants = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allRestaurants;

    return allRestaurants.filter((r: any) => {
      const restFranchise = getFranchiseKey(r.instance_name);
      return restFranchise === userFranchiseKey;
    });
  }, [allRestaurants, currentUser, userFranchiseKey]);

  // Nom d'affichage de l'établissement sélectionné
  const currentBranchLabel = useMemo(() => {
    if (selectedInstance === 'all_franchise') {
      if (currentUser?.role === 'admin') return t.allBrandsAdmin;
      const brandName = allowedRestaurants[0]?.restaurant_name?.split('-')[0]?.trim() || t.myFranchise;
      return `${brandName} (${t.allBranchesText})`;
    }
    const found = allowedRestaurants.find((r: any) => parseInstanceName(r.instance_name) === selectedInstance);
    return found?.restaurant_name || selectedInstance;
  }, [selectedInstance, allowedRestaurants, currentUser, t]);

  // 5. Filtrage des données par Date et par Instance
  const filterByDateAndInstance = (items: any[]) => {
    return items.filter((item: any) => {
      const itemInst = parseInstanceName(item.instance_name);
      if (currentUser?.role !== 'admin') {
        const itemFranchise = getFranchiseKey(itemInst);
        if (itemFranchise !== userFranchiseKey) return false;
      }
      if (selectedInstance !== 'all_franchise') {
        if (!isInstanceMatch(itemInst, selectedInstance)) return false;
      }

      if (dateFilter === 'all') return true;
      const rawDate = item.CreatedAt || item.created_at || item.email_captured_at;
      if (!rawDate) return true;

      const itemDate = new Date(rawDate).getTime();
      const now = Date.now();

      if (dateFilter === 'today') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        return itemDate >= startOfDay.getTime();
      }
      if (dateFilter === '7d') {
        return itemDate >= now - 7 * 24 * 60 * 60 * 1000;
      }
      if (dateFilter === '30d') {
        return itemDate >= now - 30 * 24 * 60 * 60 * 1000;
      }
      if (dateFilter === 'month') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        return itemDate >= startOfMonth.getTime();
      }
      if (dateFilter === 'custom') {
        const start = customStartDate ? new Date(customStartDate).getTime() : 0;
        const end = customEndDate ? new Date(customEndDate).getTime() + 86400000 : Infinity;
        return itemDate >= start && itemDate <= end;
      }

      return true;
    });
  };

  const filteredReviews = useMemo(() => {
    let list = filterByDateAndInstance(rawReviews);
    if (ratingFilter === 'positive') {
      list = list.filter((r: any) => Number(r.rating) >= 4 || r.sentiment?.trim() === 'positive');
    } else if (ratingFilter === 'negative') {
      list = list.filter((r: any) => Number(r.rating) <= 3 || r.sentiment?.trim() === 'negative');
    } else if (['1', '2', '3', '4', '5'].includes(ratingFilter)) {
      list = list.filter((r: any) => Math.round(Number(r.rating)) === Number(ratingFilter));
    }
    return list;
  }, [rawReviews, selectedInstance, dateFilter, customStartDate, customEndDate, ratingFilter, currentUser, userFranchiseKey]);

  const negativeReviews = useMemo(() => {
    const list = filterByDateAndInstance(rawReviews);
    return list.filter((r: any) => Number(r.rating) <= 3 || r.sentiment?.trim() === 'negative');
  }, [rawReviews, selectedInstance, dateFilter, customStartDate, customEndDate, currentUser, userFranchiseKey]);

  const filteredLoyalty = useMemo(() => {
    return filterByDateAndInstance(rawLoyalty);
  }, [rawLoyalty, selectedInstance, dateFilter, customStartDate, customEndDate, currentUser, userFranchiseKey]);

  const filteredLeads = useMemo(() => {
    return filterByDateAndInstance(rawLeads);
  }, [rawLeads, selectedInstance, dateFilter, customStartDate, customEndDate, currentUser, userFranchiseKey]);

  // Métriques calculées
  const stats = useMemo(() => {
    const totalRev = filteredReviews.length;
    const positiveRev = filteredReviews.filter((r: any) => Number(r.rating) >= 4 || r.sentiment?.trim() === 'positive').length;
    const ratings = filteredReviews.map((r: any) => Number(r.rating) || 5);
    const avg = totalRev > 0 ? (ratings.reduce((a, b) => a + b, 0) / totalRev).toFixed(1) : "5.0";
    const satisfaction = totalRev > 0 ? Math.round((positiveRev / totalRev) * 100) : 100;

    const totalLoyal = filteredLoyalty.length;
    const completedCards = filteredLoyalty.filter((l: any) => Number(l.stamps_count) >= 10).length;
    const inProgressCards = totalLoyal - completedCards;
    const totalVisits = filteredLoyalty.reduce((acc, curr) => acc + (Number(curr.total_visits) || Number(curr.stamps_count) || 1), 0);

    return {
      totalRev,
      avgRating: avg,
      satisfaction: `${satisfaction}%`,
      positiveRev,
      negativeRev: negativeReviews.length,
      totalLoyal,
      completedCards,
      inProgressCards,
      totalVisits,
      totalLeads: filteredLeads.length
    };
  }, [filteredReviews, negativeReviews, filteredLoyalty, filteredLeads]);

  // Actions
  const toggleResolve = (id: number) => {
    setResolvedIssues(prev => {
      const updated = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      localStorage.setItem('smart_review_resolved_issues', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReward.trim()) return;
    setIsUpdatingReward(true);

    try {
      const activeRest = allowedRestaurants.find((r: any) => parseInstanceName(r.instance_name) === selectedInstance) || allowedRestaurants[0];
      if (activeRest?.Id) {
        await fetch(N8N_UPDATE_REWARD_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurant_id: activeRest.Id,
            reward_offer: newReward.trim(),
          }),
        });
      }
      setRewardOffer(newReward.trim());
      setNewReward('');
    } catch (e) {
      setRewardOffer(newReward.trim());
      setNewReward('');
    } finally {
      setIsUpdatingReward(false);
    }
  };

  // Exports CSV
  const exportCSV = (type: 'reviews' | 'loyalty' | 'leads') => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `export_${type}_${selectedInstance}_${dateFilter}.csv`;

    if (type === 'reviews') {
      headers = ["ID", "Date", "Instance", "Rating", "Sentiment", "Client Phone", "Review Text"];
      rows = filteredReviews.map(r => [
        String(r.Id || ""),
        r.CreatedAt ? new Date(r.CreatedAt).toLocaleDateString() : "",
        parseInstanceName(r.instance_name),
        String(r.rating || 5),
        r.sentiment || "",
        `+${r.client_phone || ""}`,
        `"${(getReviewText(r) || "").replace(/"/g, '""')}"`
      ]);
    } else if (type === 'loyalty') {
      headers = ["ID", "Date", "Instance", "Phone", "Email", "Stamps", "Total Visits", "AI Scans"];
      rows = filteredLoyalty.map(l => [
        String(l.Id || ""),
        l.CreatedAt ? new Date(l.CreatedAt).toLocaleDateString() : "",
        parseInstanceName(l.instance_name),
        `+${l.client_phone || ""}`,
        l.email || "",
        String(l.stamps_count || 0),
        String(l.total_visits || l.stamps_count || 0),
        String(l.ai_scans_count || 0)
      ]);
    } else if (type === 'leads') {
      headers = ["ID", "Date", "Instance", "Phone", "Source"];
      rows = filteredLeads.map(l => [
        String(l.Id || ""),
        l.CreatedAt ? new Date(l.CreatedAt).toLocaleDateString() : "",
        parseInstanceName(l.instance_name),
        `+${l.client_phone || ""}`,
        l.source || "WiFi"
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ================= FORMULAIRE DE CONNEXION =================
  if (!currentUser) {
    return (
      <div 
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-['Cairo',sans-serif] relative overflow-hidden"
      >
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 space-y-6 shadow-2xl relative z-10">
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">SaaS Hub v4.0</span>
            </div>
            <div className="flex items-center gap-1 bg-zinc-950/60 p-1 rounded-xl border border-zinc-800 text-xs font-bold">
              <button 
                onClick={() => handleSetLang('fr')} 
                className={`px-2 py-1 rounded-lg transition ${lang === 'fr' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                FR
              </button>
              <button 
                onClick={() => handleSetLang('en')} 
                className={`px-2 py-1 rounded-lg transition ${lang === 'en' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                EN
              </button>
              <button 
                onClick={() => handleSetLang('ar')} 
                className={`px-2 py-1 rounded-lg transition ${lang === 'ar' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                عربي
              </button>
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-2xl border border-amber-500/30 text-amber-400 mb-1">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-100">{t.loginTitle}</h1>
            <p className="text-xs text-zinc-400">{t.loginDesc}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-500" />
                {t.email}
              </label>
              <input
                type="email"
                required
                dir="ltr"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="manager@boscafe.qa"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                {t.password}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  dir="ltr"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-zinc-500 hover:text-amber-400 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-bold text-center flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-sm py-3.5 rounded-xl transition shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : t.loginBtn}
            </button>
          </form>

          <div className="pt-4 border-t border-zinc-800/80 text-center space-y-1">
            <p className="text-[11px] text-zinc-500 font-medium">Smart Review AI • {t.brandSub}</p>
            <p className="text-[10px] text-zinc-600">Multi-Store & Franchise Isolation Engine</p>
          </div>

        </div>
      </div>
    );
  }

  // ================= DASHBOARD PRINCIPAL =================
  return (
    <div 
      dir={lang === 'ar' ? 'rtl' : 'ltr'} 
      className={`min-h-screen font-['Cairo',sans-serif] transition-colors duration-300 ${
        isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* ================= BARRE DU HAUT / HEADER ================= */}
        <header className={`p-5 rounded-3xl border transition backdrop-blur-xl ${
          isDarkMode ? 'bg-zinc-900/70 border-zinc-800/80 shadow-2xl' : 'bg-white border-slate-200 shadow-md'
        }`}>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            
            {/* Logo & Info Établissement */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 text-zinc-950 rounded-2xl shadow-lg shadow-amber-500/20">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl md:text-2xl font-black tracking-tight">{currentBranchLabel}</h1>
                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {currentUser.email} • {currentUser.role === 'admin' ? 'Super Admin' : `${t.franchiseLabel} : ${userFranchiseKey.toUpperCase()}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Sélecteur de Branche & Actions */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
              
              {/* Sélecteur de Branche */}
              {allowedRestaurants.length > 1 ? (
                <div className="relative">
                  <select
                    value={selectedInstance}
                    onChange={(e) => setSelectedInstance(e.target.value)}
                    className={`appearance-none text-xs font-bold px-4 py-2.5 pr-9 rounded-xl border focus:outline-none transition cursor-pointer ${
                      isDarkMode 
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-amber-500' 
                        : 'bg-slate-100 border-slate-200 text-slate-800 focus:border-amber-500'
                    }`}
                  >
                    <option value="all_franchise">{t.allMyBranches(allowedRestaurants.length)}</option>
                    {allowedRestaurants.map((r: any) => (
                      <option key={r.Id || r.instance_name} value={parseInstanceName(r.instance_name)}>
                        {r.restaurant_name || r.instance_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              ) : (
                <div className={`px-3 py-2 rounded-xl text-xs font-bold border ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-amber-400' : 'bg-slate-100 border-slate-200 text-amber-700'}`}>
                  {allowedRestaurants[0]?.restaurant_name || currentBranchLabel}
                </div>
              )}

              {/* Bouton Rafraîchir */}
              <button
                onClick={() => fetchAllData()}
                disabled={loading}
                className={`p-2.5 rounded-xl border transition ${
                  isDarkMode ? 'bg-zinc-950 border-zinc-800 hover:text-amber-400' : 'bg-slate-100 border-slate-200 hover:text-amber-600'
                }`}
                title={t.refreshTooltip}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              </button>

              {/* Thème Sombre / Clair */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2.5 rounded-xl border transition ${
                  isDarkMode ? 'bg-zinc-950 border-zinc-800 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Langues */}
              <div className={`flex items-center p-1 rounded-xl border text-xs font-bold ${
                isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
              }`}>
                {(['fr', 'en', 'ar'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => handleSetLang(l)}
                    className={`px-2 py-1 rounded-lg uppercase transition ${
                      lang === l 
                        ? 'bg-amber-500 text-zinc-950 font-black' 
                        : isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {/* Déconnexion */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.logout}</span>
              </button>

            </div>
          </div>

          {/* ================= BARRE DE FILTRES TEMPORELS ================= */}
          <div className="mt-5 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <Calendar className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-xs font-bold text-zinc-400 hidden sm:inline">{t.periodLabel}</span>
              
              <div className={`flex items-center p-1 rounded-xl border text-xs font-semibold ${
                isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  onClick={() => setDateFilter('today')}
                  className={`px-3 py-1.5 rounded-lg transition ${dateFilter === 'today' ? 'bg-amber-500 text-zinc-950 font-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {t.periodToday}
                </button>
                <button
                  onClick={() => setDateFilter('7d')}
                  className={`px-3 py-1.5 rounded-lg transition ${dateFilter === '7d' ? 'bg-amber-500 text-zinc-950 font-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {t.period7d}
                </button>
                <button
                  onClick={() => setDateFilter('30d')}
                  className={`px-3 py-1.5 rounded-lg transition ${dateFilter === '30d' ? 'bg-amber-500 text-zinc-950 font-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {t.period30d}
                </button>
                <button
                  onClick={() => setDateFilter('month')}
                  className={`px-3 py-1.5 rounded-lg transition ${dateFilter === 'month' ? 'bg-amber-500 text-zinc-950 font-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {t.periodMonth}
                </button>
                <button
                  onClick={() => setDateFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${dateFilter === 'all' ? 'bg-amber-500 text-zinc-950 font-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {t.periodAll}
                </button>
                <button
                  onClick={() => setDateFilter('custom')}
                  className={`px-3 py-1.5 rounded-lg transition ${dateFilter === 'custom' ? 'bg-amber-500 text-zinc-950 font-black' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {t.periodCustom}
                </button>
              </div>
            </div>

            {/* Dates personnalisées */}
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl border ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-white border-slate-300 text-slate-800'}`}
                />
                <span className="text-zinc-500">→</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl border ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-white border-slate-300 text-slate-800'}`}
                />
              </div>
            )}

            {/* Export Global de la vue active */}
            <button
              onClick={() => exportCSV(activeTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                isDarkMode ? 'bg-zinc-950 border-zinc-800 hover:border-amber-500 text-zinc-300' : 'bg-white border-slate-200 hover:border-amber-500 text-slate-700 shadow-sm'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-amber-500" />
              {t.exportCSV}
            </button>
          </div>
        </header>

        {/* ================= ONGLETS DE NAVIGATION ================= */}
        <div className="flex border-b border-zinc-800 gap-4 md:gap-8 text-sm font-bold">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'reviews' 
                ? 'border-amber-500 text-amber-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Star className="w-4 h-4" />
            {t.tabReviews} ({filteredReviews.length})
          </button>

          <button
            onClick={() => setActiveTab('loyalty')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'loyalty' 
                ? 'border-amber-500 text-amber-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            {t.tabLoyalty} ({filteredLoyalty.length})
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'leads' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Wifi className="w-4 h-4" />
            {t.tabLeads} ({filteredLeads.length})
          </button>
        </div>

        {/* ================= ONGLET 1 : AVIS & E-REPUTATION ================= */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            
            {/* KPIS REVIEWS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className={`p-5 rounded-3xl border transition shadow-sm ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{t.kpiReviews}</span>
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-3xl font-black mt-3">{stats.totalRev}</p>
                <span className="text-[11px] text-zinc-500 mt-1 block">{t.overPeriod}</span>
              </div>

              <div className={`p-5 rounded-3xl border transition shadow-sm ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{t.kpiRating}</span>
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
                <p className="text-3xl font-black mt-3 text-amber-400">{stats.avgRating} <span className="text-sm text-zinc-500">/ 5</span></p>
                <span className="text-[11px] text-emerald-400 font-bold mt-1 block">{t.globalExcellence}</span>
              </div>

              <div className={`p-5 rounded-3xl border transition shadow-sm ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{t.kpiSatisfaction}</span>
                  <ThumbsUp className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-3xl font-black mt-3 text-emerald-400">{stats.satisfaction}</p>
                <span className="text-[11px] text-zinc-500 mt-1 block">{stats.positiveRev} {t.positiveReviewsText}</span>
              </div>

              <div className={`p-5 rounded-3xl border transition shadow-sm ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{t.kpiGoogleReviews}</span>
                  <ArrowUpRight className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-3xl font-black mt-3 text-blue-400">{stats.positiveRev}</p>
                <span className="text-[11px] text-blue-400/80 font-bold mt-1 block">{t.publishedToGoogle}</span>
              </div>

              <div className={`p-5 rounded-3xl border transition shadow-sm ${
                negativeReviews.length > 0 
                  ? 'bg-rose-950/20 border-rose-800/40 text-rose-200' 
                  : isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex justify-between items-center text-xs text-rose-400 font-bold">
                  <span>{t.kpiNegativeAlerts}</span>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-3xl font-black mt-3 text-rose-500">{negativeReviews.length}</p>
                <span className="text-[11px] text-rose-400 font-bold mt-1 block">{t.privatelyIntercepted}</span>
              </div>
            </div>

            {/* ================= ALERTE ROUGE : AVIS NEGATIFS INTERCEPTES ================= */}
            {negativeReviews.length > 0 && (
              <section className={`rounded-3xl p-6 border-2 transition shadow-xl ${
                isDarkMode ? 'bg-rose-950/25 border-rose-600/40 shadow-rose-950/30' : 'bg-rose-50 border-rose-300 shadow-rose-100'
              }`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-500/20 rounded-2xl text-rose-400 border border-rose-500/30 animate-pulse">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="font-black text-base md:text-lg text-rose-500">{t.negativeAlertTitle}</h2>
                      <p className="text-xs text-rose-300/80">
                        {t.negativeAlertDesc(negativeReviews.length)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-rose-500 text-zinc-950 px-3 py-1 rounded-full uppercase tracking-wider">
                    {t.actionRequired}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {negativeReviews.map((rev) => {
                    const isResolved = resolvedIssues.includes(rev.Id);
                    return (
                      <div 
                        key={rev.Id} 
                        className={`p-5 rounded-2xl border transition relative space-y-3 ${
                          isResolved 
                            ? isDarkMode ? 'bg-zinc-900/50 border-zinc-800 opacity-60' : 'bg-slate-100 border-slate-200 opacity-60'
                            : isDarkMode ? 'bg-zinc-900 border-rose-900/50 shadow-lg' : 'bg-white border-rose-200 shadow-md'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="bg-rose-500/10 text-rose-400 font-extrabold text-xs px-3 py-1 rounded-lg border border-rose-500/20 flex items-center gap-1">
                            ⭐️ {rev.rating || 2}/5 • {t.interceptedAlert}
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            {rev.CreatedAt ? new Date(rev.CreatedAt).toLocaleDateString() : t.recent}
                          </span>
                        </div>

                        <p className={`text-sm font-semibold italic ${isDarkMode ? 'text-zinc-200' : 'text-slate-800'}`}>
                          "{getReviewText(rev)}"
                        </p>

                        <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs">
                            <span className="text-zinc-500">{t.clientLabel} </span>
                            <span className="font-mono font-bold text-zinc-300">+{rev.client_phone?.trim() || t.notSpecified}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {rev.client_phone && (
                              <a
                                href={`tel:+${rev.client_phone.trim()}`}
                                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-3.5 py-2 rounded-xl transition shadow-md"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                {t.callClient}
                              </a>
                            )}
                            <button
                              onClick={() => toggleResolve(rev.Id)}
                              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition ${
                                isResolved
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                              }`}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              {isResolved ? t.resolved : t.markResolved}
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ================= FLUX DE TOUS LES AVIS ================= */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Liste filtrable des avis */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h2 className="text-lg font-extrabold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-amber-500" />
                    {t.feedTitle}
                  </h2>

                  {/* Filtre par note */}
                  <div className={`flex items-center p-1 rounded-xl border text-xs font-bold ${
                    isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
                  }`}>
                    <button
                      onClick={() => setRatingFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition ${ratingFilter === 'all' ? 'bg-amber-500 text-zinc-950 font-black' : 'text-zinc-400'}`}
                    >
                      {t.allRatings}
                    </button>
                    <button
                      onClick={() => setRatingFilter('positive')}
                      className={`px-2.5 py-1 rounded-lg transition ${ratingFilter === 'positive' ? 'bg-emerald-500 text-zinc-950 font-black' : 'text-zinc-400'}`}
                    >
                      4-5★
                    </button>
                    <button
                      onClick={() => setRatingFilter('negative')}
                      className={`px-2.5 py-1 rounded-lg transition ${ratingFilter === 'negative' ? 'bg-rose-500 text-zinc-950 font-black' : 'text-zinc-400'}`}
                    >
                      1-3★
                    </button>
                  </div>
                </div>

                {filteredReviews.length === 0 ? (
                  <div className={`p-12 text-center rounded-3xl border ${
                    isDarkMode ? 'bg-zinc-900/50 border-zinc-800 text-zinc-500' : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    {t.noReviews}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredReviews.map((rev) => {
                      const isGood = Number(rev.rating) >= 4;
                      return (
                        <div 
                          key={rev.Id} 
                          className={`p-4 rounded-2xl border transition space-y-2 ${
                            isDarkMode ? 'bg-zinc-900/70 border-zinc-800/80 hover:border-zinc-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <div className="flex text-amber-400 text-sm">
                                {'★'.repeat(Math.min(5, Number(rev.rating) || 5))}
                                {'☆'.repeat(Math.max(0, 5 - (Number(rev.rating) || 5)))}
                              </div>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                isGood 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                {isGood ? t.googleReviewBadge : t.privateInterceptBadge}
                              </span>
                            </div>

                            <span className="text-[11px] text-zinc-500 font-mono">
                              {rev.CreatedAt ? new Date(rev.CreatedAt).toLocaleDateString() : t.recent}
                            </span>
                          </div>

                          <p className={`text-sm ${isDarkMode ? 'text-zinc-200' : 'text-slate-700'}`}>
                            "{getReviewText(rev)}"
                          </p>

                          <div className="flex justify-between items-center text-xs text-zinc-500 pt-1">
                            <span>{t.telLabel} <span className="font-mono text-zinc-400">+{rev.client_phone || t.notSpecified}</span></span>
                            <span>{t.branchLabel} <span className="font-bold text-amber-500/80">{parseInstanceName(rev.instance_name)}</span></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Colonne latérale : Offre Récompense & Paramètres */}
              <div className="space-y-6">
                <div className={`p-6 rounded-3xl border space-y-4 ${
                  isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{t.rewardTitle}</h3>
                      <p className="text-xs text-zinc-500">{t.rewardDesc}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center">
                    <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">{t.currentRewardTitle}</p>
                    <p className="text-base font-black text-amber-400 mt-1">{displayRewardOffer}</p>
                  </div>

                  <form onSubmit={handleUpdateReward} className="space-y-2">
                    <input
                      type="text"
                      value={newReward}
                      onChange={(e) => setNewReward(e.target.value)}
                      placeholder={t.rewardPlaceholder}
                      className={`w-full text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none focus:border-amber-500 transition ${
                        isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-slate-100 border-slate-200 text-slate-800'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={isUpdatingReward || !newReward.trim()}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs py-2.5 rounded-xl transition shadow-md disabled:opacity-50"
                    >
                      {isUpdatingReward ? <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" /> : t.rewardBtn}
                    </button>
                  </form>
                </div>

                {/* Synthèse de conversion */}
                <div className={`p-6 rounded-3xl border space-y-3 ${
                  isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t.impactRateTitle}</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-300">
                      <span>{t.positiveValuedGoogle}</span>
                      <span className="font-bold text-emerald-400">{stats.positiveRev}</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${stats.totalRev > 0 ? (stats.positiveRev / stats.totalRev) * 100 : 100}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-zinc-300 pt-2">
                      <span>{t.negativeContained}</span>
                      <span className="font-bold text-rose-400">{stats.negativeRev}</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${stats.totalRev > 0 ? (stats.negativeRev / stats.totalRev) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ================= ONGLET 2 : CARTES DE FIDELITE & RECOMPENSES ================= */}
        {activeTab === 'loyalty' && (
          <div className="space-y-6">
            
            {/* KPIS FIDELITE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-5 rounded-3xl border transition shadow-sm ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{t.kpiCardsTotal}</span>
                  <CreditCard className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-3xl font-black mt-3">{stats.totalLoyal}</p>
                <span className="text-[11px] text-zinc-500 mt-1 block">{t.cardHolders}</span>
              </div>

              <div className={`p-5 rounded-3xl border transition shadow-sm ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{t.kpiCardsProgress}</span>
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-3xl font-black mt-3 text-amber-400">{stats.inProgressCards}</p>
                <span className="text-[11px] text-amber-500/80 font-bold mt-1 block">{t.inProgressPts}</span>
              </div>

              <div className={`p-5 rounded-3xl border transition shadow-sm ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{t.kpiCardsCompleted}</span>
                  <Award className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-3xl font-black mt-3 text-emerald-400">{stats.completedCards}</p>
                <span className="text-[11px] text-emerald-400 font-bold mt-1 block">{t.rewardUnlocked}</span>
              </div>

              <div className={`p-5 rounded-3xl border transition shadow-sm ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{t.kpiVisits}</span>
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-3xl font-black mt-3 text-purple-400">{stats.totalVisits}</p>
                <span className="text-[11px] text-zinc-500 mt-1 block">{t.recordedVisits}</span>
              </div>
            </div>

            {/* TABLEAU DES MEMBRES DU PROGRAMME DE FIDELITE */}
            <div className={`rounded-3xl border overflow-hidden shadow-sm ${
              isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'
            }`}>
              <div className="p-5 border-b border-zinc-800/80 flex justify-between items-center">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  {t.digitalCardsList(filteredLoyalty.length)}
                </h3>
                <button
                  onClick={() => exportCSV('loyalty')}
                  className="text-xs text-amber-500 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t.exportCSV}
                </button>
              </div>

              {filteredLoyalty.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 text-sm">
                  {t.noLoyalty}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b ${isDarkMode ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                      <tr>
                        <th className="p-4 font-bold">{t.thClientPhone}</th>
                        <th className="p-4 font-bold">{t.thBranch}</th>
                        <th className="p-4 font-bold">{t.thProgression}</th>
                        <th className="p-4 font-bold">{t.thVisits}</th>
                        <th className="p-4 font-bold">{t.thAiScans}</th>
                        <th className="p-4 font-bold">{t.thEmail}</th>
                        <th className="p-4 font-bold">{t.thDateCreated}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {filteredLoyalty.map((item: any) => {
                        const stamps = Math.min(10, Math.max(0, Number(item.stamps_count) || 0));
                        const isCompleted = stamps >= 10;
                        return (
                          <tr key={item.Id} className={isDarkMode ? 'hover:bg-zinc-800/30' : 'hover:bg-slate-50'}>
                            <td className="p-4 font-mono font-bold text-zinc-200">
                              +{item.client_phone?.trim()}
                            </td>
                            <td className="p-4 font-bold text-amber-500/80">
                              {parseInstanceName(item.instance_name)}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <span className={`font-black text-xs px-2 py-0.5 rounded-md border ${
                                  isCompleted 
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                  {stamps}/10
                                </span>
                                <div className="w-24 bg-zinc-800 h-2 rounded-full overflow-hidden flex">
                                  <div 
                                    className={`h-full rounded-full ${isCompleted ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                    style={{ width: `${(stamps / 10) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-4 font-bold text-zinc-300">
                              {item.total_visits || stamps} {t.visits}
                            </td>
                            <td className="p-4 font-mono text-zinc-400">
                              {item.ai_scans_count || 0}
                            </td>
                            <td className="p-4 text-zinc-400">
                              {item.email || "—"}
                            </td>
                            <td className="p-4 text-zinc-500">
                              {item.CreatedAt ? new Date(item.CreatedAt).toLocaleDateString() : t.recent}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================= ONGLET 3 : LEADS WI-FI & CONTACTS ================= */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            
            {/* KPIS LEADS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-5 rounded-3xl border transition shadow-sm ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{t.kpiLeads}</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-3xl font-black mt-3 text-emerald-400">{filteredLeads.length}</p>
                <span className="text-[11px] text-zinc-500 mt-1 block">{t.optInPhoneNumbers}</span>
              </div>

              <div className={`p-5 rounded-3xl border transition shadow-sm ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{t.mainSource}</span>
                  <Wifi className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-xl font-black mt-3 text-zinc-200">{t.captivePortal}</p>
                <span className="text-[11px] text-zinc-500 mt-1 block">{t.internetGiftWheel}</span>
              </div>

              <div className={`p-5 rounded-3xl border transition shadow-sm ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>{t.crmMarketingExport}</span>
                  <Download className="w-4 h-4 text-blue-400" />
                </div>
                <button
                  onClick={() => exportCSV('leads')}
                  className="mt-3 w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs py-2 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t.downloadCsv}
                </button>
                <span className="text-[10px] text-zinc-500 mt-1 text-center block">{t.readyForBroadcast}</span>
              </div>
            </div>

            {/* TABLEAU DES LEADS */}
            <div className={`rounded-3xl border overflow-hidden shadow-sm ${
              isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'
            }`}>
              <div className="p-5 border-b border-zinc-800/80 flex justify-between items-center">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  {t.capturedContactsBase(filteredLeads.length)}
                </h3>
              </div>

              {filteredLeads.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 text-sm">
                  {t.noLeads}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b ${isDarkMode ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                      <tr>
                        <th className="p-4 font-bold">{t.thPhoneNumber}</th>
                        <th className="p-4 font-bold">{t.thBranchEstablishment}</th>
                        <th className="p-4 font-bold">{t.thSource}</th>
                        <th className="p-4 font-bold">{t.thCaptureDate}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {filteredLeads.map((lead: any) => (
                        <tr key={lead.Id} className={isDarkMode ? 'hover:bg-zinc-800/30' : 'hover:bg-slate-50'}>
                          <td className="p-4 font-mono font-bold text-zinc-200">
                            +{lead.client_phone?.trim()}
                          </td>
                          <td className="p-4 font-bold text-amber-500/80">
                            {parseInstanceName(lead.instance_name)}
                          </td>
                          <td className="p-4">
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-bold">
                              {lead.source || "Wi-Fi Opt-in"}
                            </span>
                          </td>
                          <td className="p-4 text-zinc-400">
                            {lead.CreatedAt ? new Date(lead.CreatedAt).toLocaleString() : t.recent}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
