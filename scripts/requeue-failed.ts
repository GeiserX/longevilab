import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { queueOcrJob } from "../server/jobs/queue";

const failedJobs = [
  {
    bloodTestId: "a9d59503-e345-4227-8274-b5070bb78192",
    filePath: "d35e7340-a27d-40e6-afd9-39c35a142b55.pdf",
  },
  {
    bloodTestId: "6addcbfe-6664-440f-8c3b-b3bfe175dba9",
    filePath: "141d5f2c-dda2-4f46-a177-824b9ee74cc5.pdf",
  },
];

async function main() {
  for (const job of failedJobs) {
    await queueOcrJob(job);
  }
  process.exit(0);
}

main().catch(() => {
  process.exit(1);
});
