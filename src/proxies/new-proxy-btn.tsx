import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { addProxy, checkProxy, updateProxy } from "@/lib/db-service"
import { ProxyType } from "@/lib/types"
import { HelpCircleIcon } from "lucide-react"
import { validateProxy } from "@/lib/utils"
import { emit } from "@tauri-apps/api/event"
import { PROXY_UPDATE_EVENT_NAME } from "@/lib/consts"
import { TFunction } from "i18next"

export interface NewProxyBtnProps {
    t: TFunction
    onProxyAdded: () => void
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    editProxy: ProxyType | undefined
    setEditProxy: React.Dispatch<React.SetStateAction<ProxyType | undefined>>
}

export const NewProxyBtn = ({ t, onProxyAdded, open, setOpen, editProxy, setEditProxy }: NewProxyBtnProps) => {
    const [info, setInfo] = useState<{ name: string, remark: string }>({
        name: '',
        remark: ''
    })

    useEffect(() => {
        if (open) {
            setInfo((prev) => ({
                ...prev,
                name: editProxy ? editProxy.name ?? '' : '',
                remark: editProxy ? editProxy.remark ?? '' : ''
            }))
        }
    }, [editProxy, open])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInfo((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSaveProxy = async () => {
        console.log({ info })
        if (!info.name) {
            toast.warning(t("empty_name"))
            return
        }
        const validProxy = validateProxy(info.name)
        console.log({ validProxy })
        if (!validProxy.valid) {
            toast.warning(t("invalid_proxy"))
            return
        }
        if (editProxy) {
            if (info.name != editProxy.name) {
                const exist = await checkProxy(info.name)
                if (exist) {
                    toast.warning(t("proxy_exist"))
                    return
                }
            }
            const { rowsAffected } = await updateProxy(editProxy.id, info.name, info.remark ?? null)
            if (rowsAffected == 1) {
                toast.success(t("proxy_update_success"))
            } else {
                toast.warning(t("proxy_update_failed"))
                return
            }
        } else {
            const exist = await checkProxy(info.name)
            if (exist) {
                toast.warning(t("proxy_exist"))
                return
            } else {
                const { rowsAffected } = await addProxy(info.name, info.remark ?? null)
                if (rowsAffected == 1) {
                    toast.success(t("proxy_add_success"))
                } else {
                    toast.warning(t("proxy_add_failed"))
                    return
                }
            }
        }
        onProxyAdded()
        setOpen(false)
        setEditProxy(undefined)
        await emit(PROXY_UPDATE_EVENT_NAME)
    }

    return <div className="flex">
        <Dialog open={open} onOpenChange={(open) => {
            setOpen(open)
            !open && setEditProxy(undefined)
        }}>
            <DialogTrigger asChild>
                <div>
                    <Button>
                        <span className="text-xs">{t('new_proxy')}</span>
                    </Button>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editProxy ? t('edit_proxy') : t('new_proxy')}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <div className="flex gap-2 items-center">
                            <Label htmlFor="name" className="text-right">
                                {t('name')}
                            </Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <HelpCircleIcon size={15} />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>http(socks5)://username:password@host:port</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <Input
                            className="col-span-3"
                            placeholder={t("proxy_info")}
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
                    <Button type="submit" onClick={handleSaveProxy}>{t('save')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
}
