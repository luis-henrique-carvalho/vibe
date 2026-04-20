"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

const Page = () => {
  const [value, setValue] = useState("");

  const trpc = useTRPC();

  const { data: messages } = useQuery(trpc.messages.getAll.queryOptions());

  const invoke = useMutation(
    trpc.messages.create.mutationOptions({
      onSuccess: () => {
        toast.success("Message created successfully!");
      },
    }),
  );

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Input
        placeholder="Type something..."
        className="mb-4"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        disabled={invoke.isPending}
        onClick={() => invoke.mutate({ content: value })}
      >
        Invoke Background job
      </Button>
      {JSON.stringify(messages)}
    </div>
  );
};

export default Page;
