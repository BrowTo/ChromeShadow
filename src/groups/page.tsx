import { GroupType } from "@/lib/types"
import { getColumns } from "./columns"
import { DataTable } from "./data-table"
import { useEffect, useState } from "react"
import { deleteGroup, getGroups } from "@/lib/db-service"
import { toast } from "sonner"

export function GroupsPage() {
    const [data, setData] = useState<Array<GroupType>>([])
    const [editGroup, setEditGroup] = useState<GroupType | undefined>()
    const [editOpen, setEditOpen] = useState(false)

    useEffect(() => {
        refreshGroup()
    }, [])

    const refreshGroup = async () => {
        const groups = await getGroups()
        setData(groups)
    }

    const onOpenEdit = (editGroup: GroupType) => {
        setEditGroup(editGroup)
        setEditOpen(true)
    }

    const onDelete = async (id: number) => {
        const { rowsAffected } = await deleteGroup(id)
        if (rowsAffected == 1) {
            toast.success("Delete success")
            await refreshGroup()
        } else {
            toast.warning("Delete failed")
        }
    }

    return (
        <div className="container mx-auto px-4">
            <DataTable columns={getColumns(onOpenEdit, onDelete)} data={data} onRefresh={refreshGroup} editGroup={editGroup} setEditGroup={setEditGroup} editOpen={editOpen} setEditOpen={setEditOpen} />
        </div>
    )
}
