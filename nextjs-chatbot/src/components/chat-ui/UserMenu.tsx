"use client";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

export function UserMenu() {
    const { authState, logout } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        await logout();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-[#3333cc] font-semibold hover:bg-[#3333cc]/10 transition px-3"
                >
                    <User className="h-5 w-5" />
                    {authState.user ? authState.user.username : 'User'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push('/profile')}
                >
                    Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push('/settings')}
                >
                    Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push('/help')}
                >
                    Help & Support
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer text-red-500"
                    onClick={handleSignOut}
                >
                    Log Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
