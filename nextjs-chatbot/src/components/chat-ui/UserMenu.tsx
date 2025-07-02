"use client"
import { User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

export function UserMenu() {
    const { authState, logout } = useAuth()
    const router = useRouter()

    const handleSignOut = async () => {
        await logout()
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-blue-400 font-medium hover:bg-blue-600/20 transition-colors px-3 py-2 rounded-full border border-gray-700 bg-gray-900/50"
                >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">{authState.user ? authState.user.username : "User"}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-gray-900/95 backdrop-blur-sm border-gray-700 text-white">
                <DropdownMenuItem
                    className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800 text-gray-300 hover:text-white"
                    onClick={() => router.push("/profile")}
                >
                    Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800 text-gray-300 hover:text-white"
                    onClick={() => router.push("/settings")}
                >
                    Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800 text-gray-300 hover:text-white"
                    onClick={() => router.push("/help")}
                >
                    Help & Support
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer hover:bg-red-900/50 focus:bg-red-900/50 text-red-400 hover:text-red-300"
                    onClick={handleSignOut}
                >
                    Log Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
export default UserMenu