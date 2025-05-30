import { ProfileStatusType, ProfileType } from "@/lib/types"
import { DataTable } from "./data-table"
import { useEffect, useRef, useState } from "react"
import { getProfiles } from "@/lib/db-service"
import { listen } from '@tauri-apps/api/event'
import { CHROME_API_CLOSE_EVENT_NAME, CHROME_API_LAUNCH_EVENT_NAME, CHROME_CLOSED_EVENT_NAME, CHROME_STARTED_EVENT_NAME, PROFILE_REFRESH_EVENT_NAME } from "@/lib/consts"
import { invoke } from "@tauri-apps/api/core"
import { getLastNameFromPath, launchChromeWithProfile } from "@/lib/utils"
import { getColumns } from "./columns"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

export function ProfilePage() {
    const [data, setData] = useState<Array<ProfileType>>([])
    const [runningData, setRunningData] = useState<Array<ProfileStatusType>>([])
    const { t } = useTranslation()
    const unlistenRef = useRef<(() => void) | null>(null)
    const unlistenChromeCloseRef = useRef<(() => void) | null>(null)
    const unlistenChromeStartRef = useRef<(() => void) | null>(null)
    const unlistenChromeApiLaunchRef = useRef<(() => void) | null>(null)
    const unlistenChromeApiCloseRef = useRef<(() => void) | null>(null)
    const curGroupIdRef = useRef<number>(0)
    const tableRef = useRef<any>(null)

    useEffect(() => {
        refreshProfiles(curGroupIdRef.current)
        const setupListener = async () => {
            unlistenRef.current = await listen(PROFILE_REFRESH_EVENT_NAME, ({ payload }) => {
                console.log('Start profilie refresh...')
                let jumpLast = false
                if (payload) {
                    jumpLast = (payload as any).jumpLast
                }
                refreshProfiles(curGroupIdRef.current, jumpLast)
            })
        }
        setupListener();
        return (() => {
            if (unlistenRef.current) {
                unlistenRef.current()
            }
        })
    }, [curGroupIdRef.current])

    useEffect(() => {
        const setupListener = async () => {
            unlistenChromeApiLaunchRef.current = await listen(CHROME_API_LAUNCH_EVENT_NAME, async ({ payload }) => {
                console.log(`CHROME API LAUNCH EVENT:`, payload)
                setRunningData(prev => [...prev, { name, running: false, loading: true }])
                const id = (payload as any).id
                const name = (payload as any).name
                const port = (payload as any).port
                const proxy_name = (payload as any).proxy_name
                const profile: ProfileType = {
                    id, name, proxy_name,
                    group_name: null,
                    remark: null
                }
                await launchChromeWithProfile(profile, (name, error) => {
                    setRunningData(prev => prev.filter(item => item.name != name))
                    toast(t('open_chrome_failed', { name, error }))
                }, port)
            });
            unlistenChromeApiCloseRef.current = await listen(CHROME_API_CLOSE_EVENT_NAME, async ({ payload }) => {
                console.log(`CHROME API CLOSE EVENT:`, payload)
                const name = (payload as any).name
                const pid = Number((payload as any).pid)
                setRunningData(prev => prev.map(p => p.name == name ? { name, pid: p.pid, running: p.running, loading: true } : p))
                invoke('close_chrome', { pid }).then(console.log).catch(console.error)
            })
            unlistenChromeStartRef.current = await listen(CHROME_STARTED_EVENT_NAME, ({ payload }) => {
                console.log(`CHROME START EVENT:`, payload)
                const path = (payload as any).user_dir
                const pid = Number((payload as any).pid)
                const ws = (payload as any).ws
                const name = getLastNameFromPath(path)!
                console.log({ pid }, { name }, { ws })
                setRunningData(prev => prev.map(p => p.name == name ? { name, pid, running: true, loading: false } : p))
            })
            unlistenChromeCloseRef.current = await listen(CHROME_CLOSED_EVENT_NAME, async ({ payload }) => {
                console.log(`CHROME CLOSE EVENT:`, payload)
                const pid = Number((payload as any).pid)
                let proxy = (payload as any).proxy
                if (proxy) {
                    proxy = (proxy as string).slice(9)
                    const localProxies: any[] = await invoke('list_proxy')
                    console.log({ localProxies })
                    const findProxy: string = localProxies.find(lp => lp.addr == proxy)?.addr
                    if (findProxy) {
                        const ip = findProxy.split(':')[0]
                        const port = Number(findProxy.split(':')[1])
                        console.log(`Start stop local proxy: ${ip}:${port}`)
                        try {
                            await invoke('stop_proxy', { proxy: { ip, port } })
                        } catch (error) {
                            console.log(`Stop proxy error: ${error}`)
                        }
                    } else {
                        console.log("Local proxy find failed...")
                    }
                }
                setRunningData(prev => prev.filter(item => item.pid != pid))
            })
        }
        setupListener();
        return () => {
            if (unlistenChromeStartRef.current) {
                unlistenChromeStartRef.current()
            }
            if (unlistenChromeCloseRef.current) {
                unlistenChromeCloseRef.current()
            }
            if (unlistenChromeApiLaunchRef.current) {
                unlistenChromeApiLaunchRef.current()
            }
            if (unlistenChromeApiCloseRef.current) {
                unlistenChromeApiCloseRef.current()
            }
        }
    }, [])

    const refreshProfiles = async (groupId: number, jumpLast: boolean = false) => {
        curGroupIdRef.current = groupId
        const profiles = await getProfiles(groupId)
        console.log({ profiles })
        setData(profiles)
        const opendChromes: any[] = await invoke('list_chrome_instances')
        console.log({ opendChromes })
        const runningProfiles: ProfileStatusType[] = opendChromes.map(oc => (
            { name: getLastNameFromPath(oc.user_dir as string)!, pid: oc.pid, running: true, loading: false }
        ))
        setRunningData(runningProfiles)
        setTimeout(() => {
            if (tableRef.current && jumpLast) {
                const pageSize = tableRef.current.getState().pagination.pageSize
                const jumpPage = Math.ceil((profiles.length / pageSize) - 1)
                console.log({ pageSize }, { jumpPage })
                tableRef.current.setPageIndex(jumpPage)
            }
        }, 10)
    }

    return (
        <div className="container mx-auto px-4">
            <DataTable t={t} ref={tableRef} columns={getColumns(t, runningData, (name, open) => {
                if (open) {
                    setRunningData(prev => [...prev, { name, running: false, loading: true }])
                } else {
                    setRunningData(prev => prev.map(p => p.name == name ? { name, pid: p.pid, running: p.running, loading: true } : p))
                }
            }, (name, error) => {
                setRunningData(prev => prev.filter(item => item.name != name))
                toast(t('open_chrome_failed', { name, error }))
            })} data={data} onFilterGroup={refreshProfiles} onRefresh={() => {
                refreshProfiles(curGroupIdRef.current)
            }} onLoading={(names, open) => {
                if (open) {
                    const loadingData = names.map(name => ({ name, running: false, loading: true }))
                    setRunningData(prev => [...prev, ...loadingData])
                } else {
                    setRunningData(prev => prev.map(p => names.includes(p.name) ? { name: p.name, pid: p.pid, running: p.running, loading: true } : p))
                }
            }} onOpenFailed={(name, error) => {
                setRunningData(prev => prev.filter(item => item.name != name))
                toast(t('open_chrome_failed', { name, error }))
            }} />
        </div>
    )
}
