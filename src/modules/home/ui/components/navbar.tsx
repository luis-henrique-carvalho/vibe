"use client";

import Link from "next/link";
import Image from "next/image";
import { LogInIcon, UserPlusIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { UserControl } from "@/components/user-control";
import { Skeleton } from "@/components/ui/skeleton";

export const Navbar = () => {
  const { data: session, isPending } = authClient.useSession();

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-transparent bg-transparent p-4 transition-all duration-200">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Vibe" width={24} height={24} />
          <span className="text-lg font-semibold">Vibe</span>
        </Link>
        {isPending ? (
          <Skeleton className="h-8 w-28" />
        ) : session ? (
          <UserControl showName />
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/sign-up">
                <UserPlusIcon />
                Sign up
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/sign-in">
                <LogInIcon />
                Sign in
              </Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};
