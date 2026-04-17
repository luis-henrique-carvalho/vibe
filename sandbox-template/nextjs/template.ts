import { Template } from "e2b";

export const template = Template()
  .fromImage("node:24-slim")
  .setUser("root")
  .setWorkdir("/")
  .runCmd(
    "apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*",
  )
  .copy("compile_page.sh", "/compile_page.sh")
  .runCmd("chmod +x /compile_page.sh")
  .setWorkdir("/home/user/nextjs-app")
  .runCmd("npx --yes create-next-app@16.2.3 . --yes")
  .runCmd("npx --yes shadcn@4.2.0 init --yes --preset vega --force")
  .runCmd("npx --yes shadcn@4.2.0 add --all --yes")
  .runCmd(
    "cp -a /home/user/nextjs-app/. /home/user/ && rm -rf /home/user/nextjs-app",
  )
  .setWorkdir("/home/user")
  .setUser("user")
  .setStartCmd("sudo /compile_page.sh", "sleep 20");
