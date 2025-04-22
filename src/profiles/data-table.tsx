import * as React from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    ColumnFiltersState,
    getFilteredRowModel,
    VisibilityState,
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CircleX, Trash2 } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { GroupSelect } from "@/components/group-select"
import { ProfileType } from "@/lib/types"
import { deleteProfiles } from "@/lib/db-service"
import { toast } from "sonner"
import { getLastNameFromPath, launchChromeWithProfile, removeBulkProfiles } from "@/lib/utils"
import { invoke } from "@tauri-apps/api/core"
import { TFunction } from "i18next"

interface DataTableProps {
    t: TFunction
    columns: ColumnDef<any, any>[]
    data: any[]
    onFilterGroup: (groupId: number) => void
    onRefresh: () => void
    onLoading: (names: string[], open: boolean) => void
    onOpenFailed: (name: string, error: string) => void
}

export const DataTable = React.forwardRef(({
    t,
    columns,
    data,
    onFilterGroup,
    onRefresh,
    onLoading,
    onOpenFailed
}: DataTableProps, ref) => {
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    React.useImperativeHandle(ref, () => table)

    return (
        <div>
            <div className="flex flex-row items-center pt-4 gap-4">
                <GroupSelect onSelect={onFilterGroup} />
                <Input
                    placeholder={t("search_name")}
                    value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("name")?.setFilterValue(event.target.value)
                    }
                    className="shrink"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div>
                            <Button variant="outline" className="ml-auto">
                                {t('columns')} <ChevronDown />
                            </Button>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) =>
                                            column.toggleVisibility(!!value)
                                        }
                                    >
                                        {column.columnDef.header + ""}
                                    </DropdownMenuCheckboxItem>
                                )
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex items-center py-2 gap-4">
                <Button
                    disabled={table.getFilteredSelectedRowModel().rows.length == 0}
                    onClick={async () => {
                        const rows = table.getFilteredSelectedRowModel().rows.map(r => r.original) as Array<ProfileType>
                        const runningProfiles: Array<any> = await invoke('list_chrome_instances')
                        const runningNames = runningProfiles.map(rp => getLastNameFromPath(rp.user_dir))
                        const closedProfiles = rows.filter(r => !runningNames.includes(r['name']))
                        console.log({ rows }, { runningProfiles }, { runningNames }, { closedProfiles })
                        onLoading(closedProfiles.map(cp => cp.name), true)
                        const startPromises = closedProfiles.map(async profile => {
                            await launchChromeWithProfile(profile, onOpenFailed)
                        })
                        await Promise.all(startPromises)
                    }}
                >
                    {t('open')}</Button>
                <Button
                    variant="outline"
                    size='icon'
                    disabled={table.getFilteredSelectedRowModel().rows.length == 0}
                    onClick={async () => {
                        const rows = table.getFilteredSelectedRowModel().rows.map(r => r.original) as Array<ProfileType>
                        const runningProfiles: Array<any> = await invoke('list_chrome_instances')
                        const runningNames = runningProfiles.map(rp => getLastNameFromPath(rp.user_dir))
                        const rowRunningProfiles = rows.filter(r => runningNames.includes(r['name']))
                        console.log({ rows }, { runningProfiles }, { runningNames }, { rowRunningProfiles })
                        onLoading(rowRunningProfiles.map(cp => cp.name), false)
                        const stopPromises = rowRunningProfiles.map(async profile => {
                            console.log("Start to close profile: ", profile)
                            const pid = runningProfiles[runningNames.findIndex(rn => rn == profile.name)].pid
                            invoke('close_chrome', { pid }).then(console.log).catch(console.error)
                        })
                        await Promise.all(stopPromises)
                    }}
                >
                    <CircleX />
                </Button>
                <Button
                    variant="outline"
                    size='icon'
                    disabled={table.getFilteredSelectedRowModel().rows.length == 0}
                    className="hover:text-red-600"
                    onClick={async () => {
                        const rows = table.getFilteredSelectedRowModel().rows.map(r => r.original) as Array<ProfileType>
                        console.log({ rows })
                        await removeBulkProfiles(rows.map(r => r.name))
                        const { rowsAffected } = await deleteProfiles(rows.map(r => r.id))
                        if (rowsAffected == rows.length) {
                            toast.success(t("delete_profile_success"))
                        } else {
                            toast.warning(t("delete_profile_failed"))
                        }
                        table.toggleAllRowsSelected(false)
                        onRefresh()
                    }}
                >
                    <Trash2 />
                </Button>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    {t('no_results')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-between py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {t("selected_rows", { selected: table.getFilteredSelectedRowModel().rows.length, total: table.getFilteredRowModel().rows.length })}
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm">{t('rows_per_page')}</p>
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onValueChange={(value) => {
                                table.setPageSize(Number(value))
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={table.getState().pagination.pageSize} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-center text-sm">
                        {t('page_num', { page: table.getState().pagination.pageIndex + 1, total: table.getPageCount() })}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to first page</span>
                            <ChevronsLeft />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to previous page</span>
                            <ChevronLeft />
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to next page</span>
                            <ChevronRight />
                        </Button>
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to last page</span>
                            <ChevronsRight />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
})

