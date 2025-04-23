import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { Toaster } from "@/components/ui/sonner"
import "./i18n"
import { load } from "@tauri-apps/plugin-store";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <Main />
);

function Main() {
    const [inited, setInited] = useState(false)
    const { i18n: { changeLanguage } } = useTranslation()
    useEffect(() => {
        load("settings.json").then((store) => {
            store.get("lang").then((lang) => {
                console.log(`Start to init lang with: ${lang}`)
                changeLanguage(lang == 'en' ? 'en' : 'zh')
                setInited(true)
            })
        })
    }, [])
    return inited ?
        <>
            <App />
            <Toaster />
        </>
        :
        <></>
}
