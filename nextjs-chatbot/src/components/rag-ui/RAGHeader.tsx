import { Menu, X, Database, Upload, MessageSquare } from "lucide-react";
import Image from "next/image";
import { UserMenu } from "../chat-ui/UserMenu";
import Link from "next/link";

interface RAGHeaderProps {
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
}

export function RAGHeader({ onToggleSidebar, isSidebarOpen }: RAGHeaderProps) {
    return (
        <header className="w-full border-b bg-white shadow-sm dark:bg-[#3333CC] dark:border-[#3333CC]/20">
            <div className="flex items-center h-16 px-4">
                {/* Hamburger/Close icon */}
                <button
                    className="flex items-center justify-center w-10 h-10 rounded hover:bg-[#3333CC]/10"
                    onClick={onToggleSidebar}
                    aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                    {isSidebarOpen ? (
                        <X className="h-6 w-6 text-[#3333CC]" />
                    ) : (
                        <Menu className="h-6 w-6 text-[#3333CC]" />
                    )}
                </button>

                {/* Left: Navigation */}
                <div className="flex items-center space-x-4 ml-4">
                    <Link
                        href="/"
                        className="flex items-center space-x-2 text-gray-600 hover:text-[#3333CC] transition-colors"
                    >
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-sm font-medium">Chat</span>
                    </Link>
                    <span className="text-gray-300">|</span>
                    <div className="flex items-center space-x-2 text-[#3333CC]">
                        <Database className="h-4 w-4" />
                        <span className="text-sm font-medium">RAG Management</span>
                    </div>
                </div>

                {/* Center: Logo */}
                <div className="flex-1 flex justify-center">
                    <Image
                        src="/NexiLogo.png"
                        alt="Nexi Group Logo"
                        width={110}
                        height={32}
                        className="h-8 w-auto"
                        priority
                    />
                </div>

                {/* Right: User menu */}
                <div className="w-32 flex justify-end">
                    <UserMenu />
                </div>
            </div>
        </header>
    );
}
