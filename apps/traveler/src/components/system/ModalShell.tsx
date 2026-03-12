"use client";

import { Fragment, type ReactNode } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";

type ModalMaxWidth =
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl";

const MAX_WIDTH_CLASS: Record<ModalMaxWidth, string> = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
};

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  maxWidth?: ModalMaxWidth;
  children: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  showCloseButton?: boolean;
  panelClassName?: string;
};

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export default function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  maxWidth = "3xl",
  children,
  footer,
  bodyClassName,
  showCloseButton = true,
  panelClassName,
}: ModalShellProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[10000]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px]" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  "w-full overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all",
                  MAX_WIDTH_CLASS[maxWidth],
                  panelClassName,
                )}
              >
                {(title || subtitle || showCloseButton) && (
                  <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
                    <div>
                      {title && <Dialog.Title className="text-lg font-semibold text-gray-900">{title}</Dialog.Title>}
                      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
                    </div>
                    {showCloseButton && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Cerrar"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}

                <div className={cn("px-5 py-5", bodyClassName)}>{children}</div>

                {footer ? <div className="border-t border-gray-200 px-5 py-4">{footer}</div> : null}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
