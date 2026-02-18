"use client";

import * as React from "react";
import { Dialog as BaseDialog } from "./dialog";
import { cn } from "@/lib/utils";

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
    children: React.ReactNode;
}

// Context to share state between Dialog and its children
const DialogContext = React.createContext<{
    onClose: () => void;
} | null>(null);

export function Dialog({ open, onOpenChange, children }: DialogProps) {
    const handleClose = () => onOpenChange(false);

    // Extract title from DialogTitle if present
    const [title, setTitle] = React.useState("Dialog");
    const [content, setContent] = React.useState<React.ReactNode>(null);

    React.useEffect(() => {
        // Parse children to extract title and content
        let extractedTitle = "Dialog";
        let extractedContent: React.ReactNode = null;

        React.Children.forEach(children, (child) => {
            if (React.isValidElement(child) && child.type === DialogContent) {
                const contentChildren = (child.props as any).children;
                React.Children.forEach(contentChildren, (contentChild) => {
                    if (React.isValidElement(contentChild) && contentChild.type === DialogHeader) {
                        React.Children.forEach((contentChild.props as any).children, (headerChild) => {
                            if (React.isValidElement(headerChild) && headerChild.type === DialogTitle) {
                                extractedTitle = String((headerChild.props as any).children);
                            }
                        });
                    }
                });
                extractedContent = child;
            }
        });

        setTitle(extractedTitle);
        setContent(extractedContent);
    }, [children]);

    if (!open) return null;

    return (
        <DialogContext.Provider value={{ onClose: handleClose }}>
            <BaseDialog
                isOpen={open}
                onClose={handleClose}
                title={title}
                size="lg"
                contentScroll={false}
            >
                {content}
            </BaseDialog>
        </DialogContext.Provider>
    );
}

export function DialogContent({ className, children, ...props }: DialogContentProps) {
    return (
        <div className={cn("flex flex-col h-full", className)} {...props}>
            {children}
        </div>
    );
}

export function DialogHeader({ className, children, ...props }: DialogHeaderProps) {
    return (
        <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props}>
            {children}
        </div>
    );
}

export function DialogFooter({ className, children, ...props }: DialogFooterProps) {
    return (
        <div
            className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
            {...props}
        >
            {children}
        </div>
    );
}

export function DialogTitle({ className, children, ...props }: DialogTitleProps) {
    return (
        <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props}>
            {children}
        </h2>
    );
}
