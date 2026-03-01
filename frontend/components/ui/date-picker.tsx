"use client"

import * as React from "react"
import { format, parseISO, isValid } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    value?: Date | string | null
    onChange?: (date: Date | undefined) => void
    placeholder?: string
    className?: string
    disabled?: boolean
    clearable?: boolean
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Pick a date",
    className,
    disabled,
    clearable = false,
}: DatePickerProps) {
    const date = React.useMemo(() => {
        if (!value) return undefined
        if (value instanceof Date) return value
        const parsed = parseISO(value)
        return isValid(parsed) ? parsed : undefined
    }, [value])

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal pr-8 relative",
                        !date && "text-secondary-500",
                        className
                    )}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>{placeholder}</span>}
                    {clearable && date && !disabled && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange?.(undefined);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-secondary-100 text-secondary-400 hover:text-secondary-600 transition-colors"
                        >
                            <X className="h-3 w-3" />
                        </div>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={onChange}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
