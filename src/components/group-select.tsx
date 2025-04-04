import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { getGroups } from "@/lib/db-service";
import { GroupType } from "@/lib/types";
import { useEffect, useState } from "react";

export interface GroupSelectProps {
    onSelect: (groupId: number) => void
}

export function GroupSelect({ onSelect }: GroupSelectProps) {

    const [curGroupId, setCurGroupId] = useState<number>(0)
    const [groups, setGroups] = useState<Array<GroupType>>([])

    useEffect(() => {
        (async () => {
            let groups = await getGroups()
            const header: GroupType[] = [{ id: 0, name: 'All Group', remark: '' }, { id: -1, name: 'UnGrouped', remark: '' }]
            groups = header.concat(groups)
            setGroups(groups)
        })()
    }, [])

    return (
        <Select value={curGroupId + ""} onValueChange={(groupId: string) => {
            setCurGroupId(Number(groupId))
            onSelect(Number(groupId))
        }}>
            <SelectTrigger className="w-[180px]">
                <SelectValue />
            </SelectTrigger>
            <SelectContent className="h-[250px]">
                {
                    groups.map(g => (
                        <SelectItem value={g.id + ""} key={g.id}>{g.name}</SelectItem>
                    ))
                }
            </SelectContent>
        </Select>
    )
}  