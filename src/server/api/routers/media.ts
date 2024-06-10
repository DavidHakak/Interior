import { z } from "zod";
import { env } from "~/env.mjs";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
const { Storage } = require("@google-cloud/storage");
import { v4 as uuidv4 } from "uuid";

export const mediaRouter = createTRPCRouter({
  getPreSignedUrl: publicProcedure
    .input(
      z.object({
        bucketName: z.string(),
        fileNames: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const uniqueId = uuidv4();

      const storage = new Storage({
        projectId: env.PROJECT_ID,
        credentials: {
          client_email: env.CLIENT_EMAIL,
          private_key: env.PRIVATE_KEY.split(String.raw`\n`).join("\n"),
        },
      });

      const presignedUrls: {
        name: string;
        url: string;
        type: string;
      }[] = [];
      for (const fileName of input.fileNames) {
        const options = {
          version: "v4",
          action: "write",
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        };

        const fileType = fileName.split(".").pop();
        const fileNameWithExt = `${uniqueId}.${fileType}`;

        const [url] = await storage
          .bucket(input.bucketName)
          .file(fileNameWithExt)
          .getSignedUrl(options);
        presignedUrls.push({
          name: fileNameWithExt,
          url: url,
          type: fileType || "",
        });
      }

      return { presignedUrls };
    }),
});
