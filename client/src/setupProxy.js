const { createProxyMiddleware } = require("http-proxy-middleware");
const package = require("../package.json");

process.env.DEBUG = "http-proxy-middleware:*";

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: package.proxy,
      changeOrigin: true,
      logLevel: "debug",
    })
  );
};
