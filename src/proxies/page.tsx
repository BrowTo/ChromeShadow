import { ProxyType } from "@/lib/types"
import { getColumns } from "./columns"
import { DataTable } from "./data-table"
import { useEffect, useState } from "react"
import { deleteProxy, getProxies } from "@/lib/db-service"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

export function ProxiesPage() {
    const [data, setData] = useState<Array<ProxyType>>([])
    const [editProxy, setEditProxy] = useState<ProxyType | undefined>()
    const [editOpen, setEditOpen] = useState(false)
    const { t } = useTranslation();

    useEffect(() => {
        refreshProxy()
    }, [])

    const refreshProxy = async () => {
        const proxies = await getProxies()
        setData(proxies)
    }

    const onOpenEdit = (editProxy: ProxyType) => {
        setEditProxy(editProxy)
        setEditOpen(true)
    }

    const onDelete = async (id: number) => {
        const { rowsAffected } = await deleteProxy(id)
        if (rowsAffected == 1) {
            toast.success(t("delete_proxy_success"))
            await refreshProxy()
        } else {
            toast.success(t("delete_proxy_failed"))
        }
    }

    return (
        <div className="container mx-auto px-4">
            <DataTable t={t} columns={getColumns(t, onOpenEdit, onDelete)} data={data} onRefresh={refreshProxy} editProxy={editProxy} setEditProxy={setEditProxy} editOpen={editOpen} setEditOpen={setEditOpen} />
        </div>
    )
}
