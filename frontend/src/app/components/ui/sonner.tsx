"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        style: {
          background: 'white',
          border: '1px solid #8B6F47',
          color: '#030213',
          opacity: 1,
          boxShadow: '0 10px 40px rgba(139, 111, 71, 0.2)',
          fontSize: '14px',
        },
        classNames: {
          toast: 'group-[.toaster]:bg-white group-[.toaster]:text-foreground group-[.toaster]:border-[#8B6F47]/30 group-[.toaster]:shadow-lg',
          title: 'group-[.toast]:text-foreground group-[.toast]:font-semibold group-[.toast]:opacity-100',
          description: '!text-foreground !opacity-100 group-[.toast]:text-sm',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          error: 'group-[.toaster]:bg-red-50 group-[.toaster]:text-red-900 group-[.toaster]:border-red-300',
          success: 'group-[.toaster]:bg-green-50 group-[.toaster]:text-green-900 group-[.toaster]:border-green-300',
          warning: 'group-[.toaster]:bg-yellow-50 group-[.toaster]:text-yellow-900 group-[.toaster]:border-yellow-300',
          info: 'group-[.toaster]:bg-blue-50 group-[.toaster]:text-blue-900 group-[.toaster]:border-blue-300',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };