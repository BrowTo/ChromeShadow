import { useTranslation } from "react-i18next"
import { Button } from "./ui/button"
import { Check, ChevronsUpDown } from "lucide-react"
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
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "./ui/label"
import { useEffect, useRef, useState } from "react"
import { cn, createLocalProfile } from "@/lib/utils"
import { addProfile, checkProfile, getGroups, getProxies, updateProfile } from "@/lib/db-service"
import { GroupType, ProfileType, ProxyType } from "@/lib/types"
import { toast } from "sonner"
import { emit, listen } from "@tauri-apps/api/event"
import { GROUP_UPDATE_EVENT_NAME, PROFILE_EDIT_EVENT_NAME, PROFILE_REFRESH_EVENT_NAME, PROXY_UPDATE_EVENT_NAME } from "@/lib/consts"
import { BulkProfileBtn } from "./bulk-profile-btn"

export const AddProfileBtn = () => {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [info, setInfo] = useState<{
        name: string, groupId: number | undefined, groupOpen: boolean, proxyId: number | undefined, proxyOpen: boolean, remark: string
    }>({ name: '', groupId: undefined, groupOpen: false, proxyId: undefined, proxyOpen: false, remark: '' })
    const [groupInfos, setGroupInfos] = useState<Array<GroupType>>([])
    const [proxyInfos, setProxyInfos] = useState<Array<ProxyType>>([])
    const unlistenProfileRef = useRef<(() => void) | null>(null)
    const unlistenGroupRef = useRef<(() => void) | null>(null)
    const unlistenProxyRef = useRef<(() => void) | null>(null)
    const [editMode, setEditMode] = useState(false)
    const editProfileId = useRef(-1)

    useEffect(() => {
        (async () => {
            const groupResult = await getGroups()
            setGroupInfos(groupResult)
            const proxyResult = await getProxies()
            setProxyInfos(proxyResult)
        })()
        const setupListener = async () => {
            unlistenProfileRef.current = await listen(PROFILE_EDIT_EVENT_NAME, async ({ payload }) => {
                console.log('Start profilie edit...', payload)
                const editInfo = payload as ProfileType
                editProfileId.current = editInfo.id
                const groupInfos = await getGroups()
                const proxyInfos = await getProxies()
                const test = {
                    groupId: groupInfos.find(gi => gi.name == editInfo.group_name)?.id,
                    proxyId: proxyInfos.find(pi => pi.name == editInfo.proxy_name)?.id,
                }
                console.log({ groupInfos }, { proxyInfos }, { test })
                setInfo(prev => ({
                    ...prev,
                    name: editInfo.name,
                    groupId: groupInfos.find(gi => gi.name == editInfo.group_name)?.id,
                    proxyId: proxyInfos.find(pi => pi.name == editInfo.proxy_name)?.id,
                    remark: editInfo.remark ?? ''
                }))
                setEditMode(true)
                setOpen(true)
            })
            unlistenGroupRef.current = await listen(GROUP_UPDATE_EVENT_NAME, async () => {
                console.log("Start to update groups...")
                const groupResult = await getGroups()
                setGroupInfos(groupResult)
            })
            unlistenProxyRef.current = await listen(PROXY_UPDATE_EVENT_NAME, async () => {
                console.log("Start to update proxies...")
                const proxyResult = await getProxies()
                setProxyInfos(proxyResult)
            })
        }
        setupListener();
        return () => {
            if (unlistenProfileRef.current) {
                unlistenProfileRef.current()
            }
            if (unlistenGroupRef.current) {
                unlistenGroupRef.current()
            }
            if (unlistenProxyRef.current) {
                unlistenProxyRef.current()
            }
        }
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInfo((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async () => {

        console.log({ info })
        if (!info.name) {
            toast.warning("Empty name")
            return
        }
        if (!editMode) {
            const exist = await checkProfile(info.name)
            if (exist) {
                toast.warning("Profile already exist")
            } else {
                await createLocalProfile(info.name)
                const { rowsAffected } = await addProfile(info.name, info.groupId ?? null, info.proxyId ?? null, info.remark ?? null)
                if (rowsAffected == 1) {
                    toast.success("Add profile success")
                    setOpen(false)
                    await emit(PROFILE_REFRESH_EVENT_NAME, { jumpLast: true })
                    setInfo(({ name: '', groupId: undefined, groupOpen: false, proxyId: undefined, proxyOpen: false, remark: '' }))
                } else {
                    toast.warning("Add profile failed")
                }
            }
        } else {
            const { rowsAffected } = await updateProfile(editProfileId.current, info.name, info.groupId ?? null, info.proxyId ?? null, info.remark ?? null)
            if (rowsAffected == 1) {
                toast.success("Update profile success")
                setOpen(false)
                await emit(PROFILE_REFRESH_EVENT_NAME)
                setInfo(({ name: '', groupId: undefined, groupOpen: false, proxyId: undefined, proxyOpen: false, remark: '' }))
            } else {
                toast.warning("Update profile failed")
            }
        }
    }

    return <div className="flex pl-4">
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div>
                    <Button className='rounded-none rounded-l-md' onClick={() => {
                        setInfo(({ name: '', groupId: undefined, groupOpen: false, proxyId: undefined, proxyOpen: false, remark: '' }))
                        setEditMode(false)
                    }}>
                        <span className="text-xs">{t('new_profile')}</span>
                    </Button>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editMode ? 'Edit Browser Profile' : 'New Browser Profile'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            className="col-span-3"
                            value={info.name}
                            placeholder="Profile name"
                            name="name"
                            onChange={handleChange}
                            disabled={editMode}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="group" className="text-right">
                            Group
                        </Label>
                        <Popover open={info.groupOpen} onOpenChange={(open) => {
                            setInfo(prev => ({
                                ...prev,
                                groupOpen: open
                            }))
                        }}>
                            <PopoverTrigger asChild>
                                <div className="col-span-3">
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={info.groupOpen}
                                        className="justify-between w-full"
                                    >
                                        <span className="truncate">
                                            {info.groupId ? groupInfos.find((group) => group.id == info.groupId)?.name
                                                : "Select group..."}
                                        </span>
                                        <ChevronsUpDown className="opacity-50" />
                                    </Button>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 h-[250px]">
                                <Command>
                                    <CommandInput placeholder="Search group..." />
                                    <CommandList>
                                        <CommandEmpty>No group found.</CommandEmpty>
                                        <CommandGroup>
                                            {groupInfos.map((group) => (
                                                <CommandItem
                                                    key={group.id}
                                                    value={group.id + ""}
                                                    onSelect={(currentValue) => {
                                                        setInfo(prev => ({
                                                            ...prev,
                                                            groupId: Number(currentValue) == info.groupId ? undefined : Number(currentValue),
                                                            groupOpen: false
                                                        }))
                                                    }}
                                                >
                                                    {group.name}
                                                    <Check
                                                        className={cn(
                                                            "ml-auto",
                                                            info.groupId == group.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="proxy" className="text-right">
                            Proxy
                        </Label>
                        <Popover open={info.proxyOpen} onOpenChange={(open) => {
                            setInfo(prev => ({
                                ...prev,
                                proxyOpen: open
                            }))
                        }}>
                            <PopoverTrigger asChild>
                                <div className="col-span-3">
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={info.proxyOpen}
                                        className="justify-between w-full"
                                    >
                                        <span className="truncate">{info.proxyId
                                            ? proxyInfos.find((proxy) => proxy.id == info.proxyId)?.name
                                            : "Select proxy..."}
                                        </span>
                                        <ChevronsUpDown className="opacity-50" />
                                    </Button>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 h-[250px]">
                                <Command>
                                    <CommandInput placeholder="Search proxy..." />
                                    <CommandList>
                                        <CommandEmpty>No proxy found.</CommandEmpty>
                                        <CommandGroup>
                                            {proxyInfos.map((proxy) => (
                                                <CommandItem
                                                    key={proxy.id}
                                                    value={proxy.id + ""}
                                                    onSelect={(currentValue) => {
                                                        setInfo(prev => ({
                                                            ...prev,
                                                            proxyId: Number(currentValue) == info.proxyId ? undefined : Number(currentValue),
                                                            proxyOpen: false
                                                        }))
                                                    }}
                                                >
                                                    {proxy.name}
                                                    <Check
                                                        className={cn(
                                                            "ml-auto",
                                                            info.proxyId == proxy.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="remark" className="text-right">
                            Remark
                        </Label>
                        <Input
                            id="remark"
                            name="remark"
                            className="col-span-3"
                            placeholder="Optional"
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
                    <Button type="submit" onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <BulkProfileBtn groupInfos={groupInfos} proxyInfos={proxyInfos} />
    </div>
}
