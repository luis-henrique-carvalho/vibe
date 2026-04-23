import { Suspense } from "react";

import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { ProjectView } from "@/modules/project/ui/views/project-view";

interface Props {
  params: Promise<{
    project_id: string;
  }>;
}

const Page = async ({ params }: Props) => {
  const { project_id } = await params;

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.messages.getAll.queryOptions({ projectId: project_id }),
  );
  void queryClient.prefetchQuery(
    trpc.projects.getOne.queryOptions({ id: project_id }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<p>Loading Project...</p>}>
        <ProjectView projectId={project_id} />
      </Suspense>
    </HydrationBoundary>
  );
};

export default Page;
