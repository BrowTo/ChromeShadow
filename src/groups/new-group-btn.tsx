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
import { TFunction } from "i18next"

export interface NewGroupBtnProps {
    t: TFunction,
    onGroupAdded: () => void
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    editGroup: GroupType | undefined
    setEditGroup: React.Dispatch<React.SetStateAction<GroupType | undefined>>
}

export const NewGroupBtn = ({ t, onGroupAdded, open, setOpen, editGroup, setEditGroup }: NewGroupBtnProps) => {
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
            toast.warning(t("empty_name"))
            return
        }
        if (editGroup) {
            if (info.name != editGroup.name) {
                const exist = await checkGroup(info.name)
                if (exist) {
                    toast.warning(t("group_exist"))
                    return
                }
            }
            const { rowsAffected } = await updateGroup(editGroup.id, info.name, info.remark ?? null)
            if (rowsAffected == 1) {
                toast.success(t("group_update_success"))
            } else {
                toast.warning(t("group_update_failed"))
                return
            }
        } else {
            const exist = await checkGroup(info.name)
            if (exist) {
                toast.warning(t("group_exist"))
                return
            } else {
                const { rowsAffected } = await addGroup(info.name, info.remark ?? null)
                if (rowsAffected == 1) {
                    toast.success(t("add_group_success"))
                } else {
                    toast.warning(t("add_group_failed"))
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
                    <DialogTitle>{editGroup ? t('edit_group') : t('new_group')}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            {t('name')}
                        </Label>
                        <Input
                            className="col-span-3"
                            placeholder={t("group_name")}
                            name='name'
                            value={info.name}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="remark" className="text-right">
                            {t('remark')}
                        </Label>
                        <Input
                            className="col-span-3"
                            placeholder={t("optional")}
                            name='remark'
                            value={info.remark}
                            onChange={handleChange}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            {t('close')}
                        </Button>
                    </DialogClose>
                    <Button type="submit" onClick={handleSaveGroup}>{t('save')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
}
