"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const Page = () => {
  const router = useRouter();
  const [message, setMessage] = useState("");

  const trpc = useTRPC();

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Project created successfully!");

        router.push(`/projects/${data.id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="max-w-7xl mx-auto flex items-center flex-col gap-y-4 jusify-center">
        <Input
          value={message}
          disabled={createProject.isPending}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button
          disabled={createProject.isPending}
          onClick={() => createProject.mutate({ message: message })}
        >
          Create Project
        </Button>
      </div>
    </div>
  );
};

export default Page;
