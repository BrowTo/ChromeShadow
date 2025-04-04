import { useTranslation } from "react-i18next"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { addGroup, checkGroup, updateGroup } from "@/lib/db-service"
import { GroupType } from "@/lib/types"
import { emit } from "@tauri-apps/api/event"
import { GROUP_UPDATE_EVENT_NAME } from "@/lib/consts"

export interface NewGroupBtnProps {
    onGroupAdded: () => void
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    editGroup: GroupType | undefined
    setEditGroup: React.Dispatch<React.SetStateAction<GroupType | undefined>>
}

export const NewGroupBtn = ({ onGroupAdded, open, setOpen, editGroup, setEditGroup }: NewGroupBtnProps) => {
    const { t } = useTranslation()
    const [info, setInfo] = useState<{ name: string, remark: string }>({
        name: '',
        remark: ''
    })

    useEffect(() => {
        if (open) {
            setInfo((prev) => ({
                ...prev,
                name: editGroup ? editGroup.name ?? '' : '',
                remark: editGroup ? editGroup.remark ?? '' : ''
            }))
        }
    }, [editGroup, open])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInfo((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSaveGroup = async () => {
        console.log({ info })
        if (!info.name) {
            toast.warning("Name empty")
            return
        }
        if (editGroup) {
            if (info.name != editGroup.name) {
                const exist = await checkGroup(info.name)
                if (exist) {
                    toast.warning("Group name already exist")
                    return
                }
            }
            const { rowsAffected } = await updateGroup(editGroup.id, info.name, info.remark ?? null)
            if (rowsAffected == 1) {
                toast.success("Group update success")
            } else {
                toast.warning("Group update failed")
                return
            }
        } else {
            const exist = await checkGroup(info.name)
            if (exist) {
                toast.warning("Group name already exist")
                return
            } else {
                const { rowsAffected } = await addGroup(info.name, info.remark ?? null)
                if (rowsAffected == 1) {
                    toast.success("Group added")
                } else {
                    toast.warning("Group add failed")
                    return
                }
            }
        }
        onGroupAdded()
        setOpen(false)
        setEditGroup(undefined)
        await emit(GROUP_UPDATE_EVENT_NAME)
    }

    return <div className="flex">
        <Dialog open={open} onOpenChange={(open) => {
            setOpen(open)
            !open && setEditGroup(undefined)
        }}>
            <DialogTrigger asChild>
                <div>
                    <Button>
                        <span className="text-xs">{t('new_group')}</span>
                    </Button>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editGroup ? 'Edit Group' : 'New Group'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            className="col-span-3"
                            placeholder="Group Name"
                            name='name'
                            value={info.name}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="remark" className="text-right">
                            Remark
                        </Label>
                        <Input
                            className="col-span-3"
                            placeholder="Optional"
                            name='remark'
                            value={info.remark}
                            onChange={handleChange}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Close
                        </Button>
                    </DialogClose>
                    <Button type="submit" onClick={handleSaveGroup}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
}
