"use client";

import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  showName?: boolean;
}

const getInitials = (name?: string | null, email?: string | null) => {
  const source = name || email || "User";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

export const UserControl = ({ showName }: Props) => {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-8 w-28" />;
  }

  if (!session) {
    return null;
  }

  const { user } = session;
  const displayName = user.name || user.email;

  const onSignOut = async () => {
    const result = await authClient.signOut();

    if (result.error) {
      toast.error(result.error.message ?? "Unable to sign out");
      return;
    }

    router.push("/sign-in");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={showName ? "sm" : "icon-sm"}>
          <Avatar size="sm">
            {user.image && <AvatarImage src={user.image} alt={displayName} />}
            <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
          </Avatar>
          {showName && <span className="max-w-32 truncate">{displayName}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm text-foreground">{displayName}</span>
          <span className="truncate text-xs font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOutIcon />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
