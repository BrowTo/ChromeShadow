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

export interface NewProxyBtnProps {
    onProxyAdded: () => void
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    editProxy: ProxyType | undefined
    setEditProxy: React.Dispatch<React.SetStateAction<ProxyType | undefined>>
}

export const NewProxyBtn = ({ onProxyAdded, open, setOpen, editProxy, setEditProxy }: NewProxyBtnProps) => {
    const { t } = useTranslation()
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
            toast.warning("Name empty")
            return
        }
        const validProxy = validateProxy(info.name)
        console.log({ validProxy })
        if (!validProxy.valid) {
            toast.warning("Invalid proxy info")
            return
        }
        if (editProxy) {
            if (info.name != editProxy.name) {
                const exist = await checkProxy(info.name)
                if (exist) {
                    toast.warning("Proxy name already exist")
                    return
                }
            }
            const { rowsAffected } = await updateProxy(editProxy.id, info.name, info.remark ?? null)
            if (rowsAffected == 1) {
                toast.success("Proxy update success")
            } else {
                toast.warning("Proxy update failed")
                return
            }
        } else {
            const exist = await checkProxy(info.name)
            if (exist) {
                toast.warning("Proxy name already exist")
                return
            } else {
                const { rowsAffected } = await addProxy(info.name, info.remark ?? null)
                if (rowsAffected == 1) {
                    toast.success("Proxy added")
                } else {
                    toast.warning("Proxy add failed")
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
                    <DialogTitle>{editProxy ? 'Edit Proxy' : 'New Proxy'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <div className="flex gap-2 items-center">
                            <Label htmlFor="name" className="text-right">
                                Name
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
                            placeholder="Proxy info"
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
                    <Button type="submit" onClick={handleSaveProxy}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
}
