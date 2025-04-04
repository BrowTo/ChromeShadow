import { useTranslation } from "react-i18next";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils";
import { ChevronDown, Copy } from "lucide-react";
import { type } from "@tauri-apps/plugin-os"
import { load, Store } from "@tauri-apps/plugin-store";

const systemConfFormSchema = () => z.object({
    chrome_path: z.string(),
    lang: z.enum(["en", "zh"]),
})

type SystemConfFormValues = z.infer<ReturnType<typeof systemConfFormSchema>>
let store: Store;

const initOrLoadSettings = async () => {
    store = await load('settings.json');
    const chrome_path = await store.get('chrome_path');
    const lang = await store.get('lang');
    console.log({ chrome_path }, { lang })
    if (!chrome_path && !lang) {
        const defaultValues = {
            chrome_path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", lang: 'zh'
        } as SystemConfFormValues
        for (const [key, value] of Object.entries(defaultValues)) {
            console.log({ key }, { value })
            await store.set(key, value)
        }
        await store.save()
        console.log("Store inited...")
        return defaultValues
    } else {
        return { chrome_path, lang } as SystemConfFormValues
    }
}

let defaultValues = await initOrLoadSettings()

export function SettingsPage() {

    const { t, i18n: { changeLanguage, language } } = useTranslation();
    const [currentLanguage, setCurrentLanguage] = useState(language)
    const [isWindows, setIsWindows] = useState(false)

    const form = useForm<SystemConfFormValues>({
        resolver: zodResolver(systemConfFormSchema()),
        defaultValues,
    })

    useEffect(() => {
        const checkOs = async () => {
            const osType = await type()
            setIsWindows(osType == 'windows')
        }
        checkOs();
    }, [])

    async function onSubmit(data: SystemConfFormValues) {
        console.log("Update system pref: ", JSON.stringify(data, null, 2))
        toast("config_update_success")
        for (const [key, value] of Object.entries(data)) {

            await store.set(key, value)
        }
        await store.save()
        if (currentLanguage != data.lang) {
            handleChangeLanguage()
        }
        defaultValues = data
    }

    const handleChangeLanguage = () => {
        const newLanguage = currentLanguage === "en" ? "zh" : "en";
        setCurrentLanguage(newLanguage);
        changeLanguage(newLanguage);
    }

    return (
        <div className="flex flex-col p-4 gap-8">
            <div className="flex flex-col gap-2">
                <div className="text-sm font-medium">API</div>
                <p className="text-muted-foreground text-sm">{t('api_hint')}</p>
                <div className="flex gap-4">
                    <span className="w-full text-sm text-green-600 border-green-600 border p-2 bg-green-50 rounded-sm">http://127.0.0.1:51888</span>
                    <Button size='icon'>
                        <Copy />
                    </Button>
                </div>
            </div>
            <Form {...form} >
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {
                        !isWindows &&
                        <FormField
                            control={form.control}
                            name="chrome_path"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('chrome_path')}</FormLabel>
                                    <FormDescription>
                                        {t('chrome_path_hint')}
                                    </FormDescription>
                                    <FormControl>
                                        <div>
                                            <Input placeholder="chrome_path_input" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    }
                    <FormField
                        control={form.control}
                        name="lang"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('language')}</FormLabel>
                                <FormDescription>
                                    {t('language_hint')}
                                </FormDescription>
                                <div className="relative w-max">
                                    <FormControl>
                                        <select
                                            className={cn(
                                                buttonVariants({ variant: "outline" }),
                                                "w-[100px] appearance-none bg-transparent font-normal"
                                            )}
                                            {...field}
                                        >
                                            <option value="en">English</option>
                                            <option value="zh">中文</option>
                                        </select>
                                    </FormControl>
                                    <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 opacity-50" />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit">{t('update')}</Button>
                </form>
            </Form>
        </div>
    )
}
