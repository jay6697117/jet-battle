import { serveDir } from "jsr:@std/http/file-server";

Deno.serve((req) => {
  return serveDir(req, {
    fsRoot: "dist", // 你的 Vite 打包产物目录
    urlRoot: "",
    showDirListing: true,
    enableCors: true,
  });
});
