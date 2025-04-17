import { AppWindow, FolderTree, Settings, Chrome, Earth, Send, ChevronRight } from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { AddProfileBtn } from "./add-profile-btn"
import { useEffect, useState } from "react"
import { ProfilePage } from "@/profiles/page"
import { GroupsPage } from "@/groups/page"
import { SettingsPage } from "@/settings/page"
import { useTranslation } from "react-i18next"
import { TFunction } from "i18next"
import { ProxiesPage } from "@/proxies/page"
import { getVersion } from "@tauri-apps/api/app"
import { open as openUrl } from "@tauri-apps/plugin-shell"

export type MenuType = {
    title: string,
    icon: any,
    page: React.ReactNode
}

// Menu items.
export function getMenuItems(t: TFunction): Array<MenuType> {
    return ([
        {
            title: t("profiles"),
            icon: AppWindow,
            page: <ProfilePage />
        },
        {
            title: t("groups"),
            icon: FolderTree,
            page: <GroupsPage />
        },
        {
            title: t("proxies"),
            icon: Earth,
            page: <ProxiesPage />
        },
        {
            title: t("settings"),
            icon: Settings,
            page: <SettingsPage />
        },
    ])
}

const navSecondary = [
    {
        title: "Support",
        url: "#",
        icon: Send,
    },
]

export interface AppSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    onMenuSelected: (item: MenuType) => void
}

export function AppSidebar({ onMenuSelected }: AppSidebarProps) {

    const { t, i18n: { language } } = useTranslation()
    const [curMenu, setCurMenu] = useState(0)
    const [menuItems, setMenuItems] = useState(getMenuItems(t))
    const [version, setVersion] = useState("")
    useEffect(() => {
        const newMenu = getMenuItems(t)
        onMenuSelected(newMenu[curMenu])
        setMenuItems(newMenu)
    }, [t, language])

    useEffect(() => {
        (async () => {
            const appVersion = await getVersion()
            setVersion(appVersion)
        })()
    }, [])

    return (
        <Sidebar collapsible="offcanvas">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                <Chrome className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">
                                    {t('app_name')}
                                </span>
                                <span className="truncate text-xs">v{version}</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <AddProfileBtn />
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {menuItems.map((item, index) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={index == curMenu} onClick={() => {
                                        setCurMenu(index)
                                        onMenuSelected(item)
                                    }}>
                                        <a> <item.icon /> <span>{item.title}</span> </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild onClick={async () => {
                            await openUrl("https://t.me/+DMqNZV1aR_85NTMx")
                        }}>
                            <a> <Send /> <span>Telegram</span> <ChevronRight className="ml-auto" /> </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
