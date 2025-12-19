/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "charlie-wade",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("CharlieWadeBucket");
    const api = new sst.aws.ApiGatewayV2("CharlieWadeApi");

    api.route("GET /chapters", {
      link: [bucket],
      handler: "src/chapters.list",
    });

    api.route("GET /chapters/{name}", {
      link: [bucket],
      handler: "src/chapters.get",
    });
  },
});
