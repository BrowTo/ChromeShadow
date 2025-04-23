import { useEffect, useState } from "react";
import { AppSidebar, getMenuItems, MenuType } from "./components/app-sidebar";
import { Separator } from "./components/ui/separator";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "./components/ui/sidebar";
import { useTranslation } from "react-i18next";
import { getCurrentWindow } from "@tauri-apps/api/window"
import { invoke } from "@tauri-apps/api/core";
import { exit } from "@tauri-apps/plugin-process"

function App() {
    const { t } = useTranslation()
    const [menuItem, SetMenuItem] = useState<MenuType>(getMenuItems(t)[0])

    useEffect(() => {
        getCurrentWindow().onCloseRequested(async (event) => {
            console.log({ event })
            try {
                const runningProfile: Array<any> = await invoke('list_chrome_instances');
                console.log({ runningProfile })
                const closePromises = runningProfile.map(async (profile) => {
                    const result: string = await invoke('close_chrome', { pid: profile.pid });
                    console.log(result);
                });
                await Promise.all(closePromises);
                console.log('All Chrome instances have been closed.');
                event.preventDefault();
                exit(0)
            } catch (error) {
                console.log(error)
            }
        })

    }, [])

    return (
        <SidebarProvider>
            <AppSidebar onMenuSelected={(item: MenuType) => {
                SetMenuItem(item)
            }} />
            <SidebarInset>
                <header className="flex h-10">
                    <div className="flex items-center gap-2 px-4 py-3">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2" />
                        <h1 className="font-bold">{menuItem.title}</h1>
                    </div>
                </header>
                {menuItem.page}
            </SidebarInset>
        </SidebarProvider>
    );
}

export default App;
