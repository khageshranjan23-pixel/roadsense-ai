import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      app_title: "RoadSense AI",
      tagline: "Where computer vision meets gamified learning",
      landing_desc: "AI-Powered Road Safety Education & Evaluation platform built on advanced research.",
      cta_start: "Start Simulation",
      cta_advisor: "Safety Advisor",
      nav_dashboard: "Dashboard",
      nav_advisor: "AI Advisor",
      nav_profile: "My Profile",
      nav_logout: "Log Out",
      nav_login: "Sign In",
      nav_signup: "Join Now",
      footer_copy: "© 2026 RoadSense AI. Zero-harm road safety mission.",
      stats_played: "Sessions Played",
      stats_decisions: "Decisions Evaluated",
      stats_protected: "Students Protected",
      card_cv_title: "Computer Vision",
      card_cv_desc: "YOLOv8 + DeepSORT tracks vehicles, measures speed and identifies road risks dynamically.",
      card_sim_title: "3D Game Engine",
      card_sim_desc: "Translates video files or AI parameters into interactive 3D simulations inside your browser.",
      card_advisor_title: "AI Safety Chat",
      card_advisor_desc: "Have a real-time discussion with our safety avatar, upload images to receive immediate advice.",
      research_title: "Backed by Published Research",
      research_desc: "Our platform pillars are rooted in the Route2School (R2S) methodology, demonstrating that immediate feedback and VR-based progressive gameplay significantly enhance street safety awareness in children."
    }
  },
  hi: {
    translation: {
      app_title: "रोडसेंस एआई",
      tagline: "जहाँ कंप्यूटर विज़न और गेमीफाइड लर्निंग का मिलन होता है",
      landing_desc: "उन्नत शोध पर आधारित एआई-संचालित सड़क सुरक्षा शिक्षा और मूल्यांकन मंच।",
      cta_start: "सिमुलेशन शुरू करें",
      cta_advisor: "सुरक्षा सलाहकार",
      nav_dashboard: "डैशबोर्ड",
      nav_advisor: "एआई सलाहकार",
      nav_profile: "मेरी प्रोफ़ाइल",
      nav_logout: "लॉग आउट",
      nav_login: "साइन इन",
      nav_signup: "अभी जुड़ें",
      footer_copy: "© 2026 रोडसेंस एआई। शून्य-हानि सड़क सुरक्षा मिशन।",
      stats_played: "खेले गए सत्र",
      stats_decisions: "मूल्यांकित निर्णय",
      stats_protected: "सुरक्षित छात्र",
      card_cv_title: "कंप्यूटर विज़न",
      card_cv_desc: "YOLOv8 + DeepSORT वाहनों को ट्रैक करता है, गति मापता है और सड़क के जोखिमों की पहचान करता है।",
      card_sim_title: "3D गेम इंजन",
      card_sim_desc: "वीडियो फ़ाइलों या एआई मापदंडों को सीधे आपके ब्राउज़र में इंटरैक्टिव 3D सिमुलेशन में बदलता है।",
      card_advisor_title: "एआई सुरक्षा चैट",
      card_advisor_desc: "हमारे सुरक्षा अवतार के साथ वास्तविक समय में चर्चा करें, तत्काल सलाह पाने के लिए चित्र अपलोड करें।",
      research_title: "प्रकाशित शोध द्वारा समर्थित",
      research_desc: "हमारे मंच के स्तंभ Route2School (R2S) कार्यप्रणाली पर आधारित हैं, जो यह दर्शाते हैं कि त्वरित प्रतिक्रिया और वीआर-आधारित प्रगतिशील गेमप्ले बच्चों में सड़क सुरक्षा जागरूकता को बढ़ाते हैं।"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
