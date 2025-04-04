import { Button } from "./ui/button"
import { Check, ChevronsUpDown, CopyPlus } from "lucide-react"
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
import { useState } from "react"
import { cn, createBulkProfiles, generateUniqueProfileName } from "@/lib/utils"
import { GroupType, ProxyType } from "@/lib/types"
import { toast } from "sonner"
import { bulkAddProfile } from "@/lib/db-service"
import { emit } from "@tauri-apps/api/event"
import { PROFILE_REFRESH_EVENT_NAME } from "@/lib/consts"

export interface BulkProfileBtnProps {
    groupInfos: GroupType[]
    proxyInfos: ProxyType[]
}

export const BulkProfileBtn = ({ groupInfos, proxyInfos }: BulkProfileBtnProps) => {
    const [open, setOpen] = useState(false)
    const [info, setInfo] = useState<{
        size: number, groupId: number | undefined, groupOpen: boolean, proxyId: number | undefined, proxyOpen: boolean,
    }>({ size: 1, groupId: undefined, groupOpen: false, proxyId: undefined, proxyOpen: false })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInfo((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async () => {
        console.log({ info })
        if (info.size <= 0) {
            toast.warning("Size error")
            return
        }
        const profileNames = generateUniqueProfileName(info.size)
        await createBulkProfiles(profileNames)
        const success = await bulkAddProfile(profileNames, info.groupId ?? null, info.proxyId ?? null)
        if (success) {
            toast.success("Add profiles success")
            setOpen(false)
            await emit(PROFILE_REFRESH_EVENT_NAME, { jumpLast: true })
            setInfo(({ size: 1, groupId: undefined, groupOpen: false, proxyId: undefined, proxyOpen: false }))
        } else {
            toast.warning("Add profiles failed")
        }
    }

    return <div className="flex">
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div>
                    <Button className='rounded-none rounded-r-md ml-[0.5px]' onClick={() => {
                        setInfo(({ size: 1, groupId: undefined, groupOpen: false, proxyId: undefined, proxyOpen: false }))
                    }}>
                        <CopyPlus className="h-4 w-4" />
                    </Button>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>New Bulk Browser Profile</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Size
                        </Label>
                        <Input
                            id="size"
                            className="col-span-3"
                            value={info.size}
                            name="size"
                            onChange={handleChange}
                            type="number"
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
                                        <span className="truncate">
                                            {info.proxyId ? proxyInfos.find((proxy) => proxy.id == info.proxyId)?.name
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
    </div>
}
