import { Template, defaultBuildLogger } from "e2b";
import { template } from "./template";

async function main() {
  await Template.build(template, "vibe-nextjs-test-9225", {
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch(console.error);
