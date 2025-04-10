import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import "./i18n"
import { Toaster } from "@/components/ui/sonner"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <>
        <App />
        <Toaster />
    </>
);
