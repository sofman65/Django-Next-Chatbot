import { Menu, X, Database, Upload, MessageSquare, Settings } from "lucide-react";
import { Orbitron } from 'next/font/google';
import { UserMenu } from "../chat-ui/UserMenu";
import Link from "next/link";
import { cn } from "@/lib/utils";

const orbitron = Orbitron({
    subsets: ['latin'],
    weight: ['400', '700'],
});

interface RAGHeaderProps {
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
}

export function RAGHeader({ onToggleSidebar, isSidebarOpen }: RAGHeaderProps) {
    return (
        <header className="w-full border-b border-white/10 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-30 shadow-lg shadow-blue-900/10">
            <div className="flex items-center h-16 px-4">
                {/* Hamburger/Close icon */}
                <button
                    className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-800/50 transition-all duration-200"
                    onClick={onToggleSidebar}
                    aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                    {isSidebarOpen ? (
                        <X className="h-6 w-6 text-white" />
                    ) : (
                        <Menu className="h-6 w-6 text-white" />
                    )}
                </button>

                {/* Left: Navigation */}
                <div className="flex items-center space-x-4 ml-4">
                    <Link
                        href="/"
                        className="flex items-center space-x-2 text-gray-300 hover:text-blue-400 transition-all duration-200"
                    >
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-sm font-medium">Chat</span>
                    </Link>
                    <span className="text-gray-600">|</span>
                    <div className="flex items-center space-x-2 text-blue-400">
                        <Database className="h-4 w-4" />
                        <span className="text-sm font-medium">RAG Management</span>
                    </div>
                </div>

                {/* Center: Logo */}
                <div className="flex-1 flex justify-center">
                    <div className={cn(
                        orbitron.className,
                        "text-xl font-bold bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent"
                    )}>
                        DoChat.ai
                    </div>
                </div>

                {/* Right: User menu */}
                <div className="w-32 flex justify-end">
                    <UserMenu />
                </div>
            </div>
        </header>
    );
}
