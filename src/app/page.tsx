import { Button } from "@/components/ui/button";
import { caller } from "@/trpc/server";
import React from "react";

const Page = async () => {
  const data = await caller.create({ text: "world" });

  console.log(data); // { greeting: 'hello world' }
  return (
    <div className="">
      <Button>Click me</Button>
    </div>
  );
};

export default Page;
