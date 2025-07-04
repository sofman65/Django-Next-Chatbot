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
        <header className="w-full border-b border-white/10 glass backdrop-blur-xl">
            <div className="flex items-center h-16 px-4">
                {/* Hamburger/Close icon */}
                <button
                    className="flex items-center justify-center w-10 h-10 rounded-lg hover:glass transition-all duration-200 hover:scale-105"
                    onClick={onToggleSidebar}
                    aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                    {isSidebarOpen ? (
                        <X className="h-6 w-6 text-stellar-white" />
                    ) : (
                        <Menu className="h-6 w-6 text-stellar-white" />
                    )}
                </button>

                {/* Left: Navigation */}
                <div className="flex items-center space-x-4 ml-4">
                    <Link
                        href="/"
                        className="flex items-center space-x-2 text-lunar-grey hover:text-blue-400 transition-all duration-200 hover:scale-105"
                    >
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-sm font-medium">Chat</span>
                    </Link>
                    <span className="text-orbit-grey">|</span>
                    <div className="flex items-center space-x-2 text-blue-400">
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
                        className="h-8 w-auto opacity-90 hover:opacity-100 transition-opacity duration-200"
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
