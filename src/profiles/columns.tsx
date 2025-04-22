import { ColumnDef } from "@tanstack/react-table"
import { Chrome, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { ProfileStatusType, ProfileType } from "@/lib/types"
import { launchChromeWithProfile, removeLocalProfile, stripCredentials } from "@/lib/utils"
import { deleteProfile } from "@/lib/db-service"
import { emit } from "@tauri-apps/api/event"
import { PROFILE_EDIT_EVENT_NAME, PROFILE_REFRESH_EVENT_NAME } from "@/lib/consts"
import { toast } from "sonner"
import { invoke } from "@tauri-apps/api/core"
import { TFunction } from "i18next"

export function getColumns(
    t: TFunction,
    runningData: ProfileStatusType[],
    onLoading: (name: string, open: boolean) => void,
    onOpenFailed: (name: string, error: string) => void): ColumnDef<ProfileType>[] {

    return [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "id",
            header: "ID",
            cell: ({ row }) => (
                <div>{row.getValue("id")}</div>
            ),
        },
        {
            accessorKey: "name",
            header: t("name"),
            cell: ({ row }) => (
                <div>{row.getValue("name")}</div>
            ),
        },
        {
            accessorKey: "group_name",
            header: t("group"),
            cell: ({ row }) => {
                const groupInfo = row.getValue("group_name") + "";
                return (
                    <div>{groupInfo == 'ungrouped' ? t('ungrouped') : groupInfo}</div>
                )
            },
        },
        {
            accessorKey: "proxy_name",
            header: t("proxy"),
            cell: ({ row }) => {
                const proxyInfo = row.getValue("proxy_name") + ""
                return (
                    <div>{proxyInfo == 'unproxied' ? t('unproxied') : stripCredentials(proxyInfo)}</div>
                )
            },
        },
        {
            accessorKey: "remark",
            header: t("remark"),
            cell: ({ row }) => (
                <div>{row.getValue("remark")}</div>
            ),
        },
        {
            id: "open",
            header: t("action"),
            enableHiding: false,
            cell: ({ row }) => {
                const profile = row.original;
                const curProfile = runningData.find(rd => rd.name == profile.name)
                const runningPid = curProfile?.pid
                const loading = curProfile?.loading
                return (
                    <Button
                        variant={runningPid ? 'destructive' : 'default'}
                        disabled={loading}
                        onClick={async () => {
                            onLoading(profile.name, !!!curProfile)
                            if (curProfile) {
                                invoke('close_chrome', { pid: runningPid }).then(console.log).catch(console.error)
                            } else {
                                await launchChromeWithProfile(profile, onOpenFailed)
                            }
                        }}>
                        <Chrome /> {loading ? t('loading') : runningPid ? t('close') : t('open')}
                    </Button>
                )
            }
        },
        {
            id: "menus",
            header: t("menus"),
            enableHiding: false,
            cell: ({ row }) => {
                const profile = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={async () => {
                                    await emit(PROFILE_EDIT_EVENT_NAME, { ...profile })
                                }}
                            > {t('edit')} </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={async () => {
                                await removeLocalProfile(profile.name)
                                await deleteProfile(profile.id)
                                await emit(PROFILE_REFRESH_EVENT_NAME)
                                toast.success(t("delete_profile_success"))
                            }}>{t('delete')}</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]
}