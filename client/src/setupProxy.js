const { createProxyMiddleware } = require("http-proxy-middleware");
const config = require("../../server/config.json");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: `http://localhost:${config.server.port}`,
      changeOrigin: true,
      secure: false,
    }),
  );
};
