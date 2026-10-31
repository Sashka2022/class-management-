import { defineConfig } from "vite";
import { createPairHandler, memoryStore } from "./server/pairing.js";
import { createSchoolHandler } from "./server/school.js";
export default defineConfig({
  plugins: [
    {
      name: "local-pairing",
      configureServer(server) {
        const store = memoryStore(),
          handler = createPairHandler(() => store);
        if (process.env.BEYACHAD_TEST_RUN === "1")
          server.middlewares.use("/__test/reset", (req, res) => {
            store.clear();
            res.statusCode = 200;
            res.end("ok");
          });
        const schoolHandler = createSchoolHandler(() => store);
        const serve = (target) => async (req, res) => {
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
          await target(req, res);
        };
        server.middlewares.use("/api/pair", serve(handler));
        server.middlewares.use("/api/school", serve(schoolHandler));
      },
    },
  ],
});
