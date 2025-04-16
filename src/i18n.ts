import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enJSON from "./locale/en.json";
import zhJSON from "./locale/zh.json";
import { load } from "@tauri-apps/plugin-store";

const store = await load("settings.json");
store.get("lang").then((lang) => {
  i18n.use(initReactI18next).init({
    resources: {
      en: { ...enJSON },
      zh: { ...zhJSON },
    },
    lng: lang == "en" ? "en" : "zh", // Set the initial language of the App
  });
});
