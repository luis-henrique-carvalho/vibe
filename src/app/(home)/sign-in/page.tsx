import { Suspense } from "react";

import { AuthForm } from "@/modules/auth/ui/components/auth-form";

const Page = () => {
  return (
    <div className="flex w-full flex-1 items-center justify-center py-[16vh]">
      <Suspense fallback={null}>
        <AuthForm mode="sign-in" />
      </Suspense>
    </div>
  );
};

export default Page;
