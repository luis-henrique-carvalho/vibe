"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { MessagesContainer } from "../components/messages-container";
import { Suspense } from "react";

interface ProjectViewProps {
  projectId: string;
}

export const ProjectView = ({ projectId }: ProjectViewProps) => {
  return (
    <div className="h-screen">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel
          defaultSize="25%"
          minSize="20%"
          className="flex flex-col min-h-0"
        >
          <Suspense fallback={<p>Loading messages...</p>}>
            <MessagesContainer projectId={projectId} />
          </Suspense>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize="75%" minSize="50%">
          TODO: Preview
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
