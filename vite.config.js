import { defineConfig } from "vite";
import { createPairHandler, memoryStore } from "./server/pairing.js";
export default defineConfig({
  plugins: [
    {
      name: "local-pairing",
      configureServer(server) {
        const store = memoryStore(),
          handler = createPairHandler(() => store);
        server.middlewares.use("/api/pair", async (req, res) => {
          let size = 0,
            chunks = [];
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 256000) {
              res.statusCode = 413;
              res.end("Request too large");
              return;
            }
            chunks.push(chunk);
          }
          try {
            req.body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
          } catch {
            res.statusCode = 400;
            res.end("Invalid JSON");
            return;
          }
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (body) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(body));
          };
          await handler(req, res);
        });
      },
    },
  ],
});
