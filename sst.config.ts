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
    const bucket = new sst.aws.Bucket("CharlieWadeBucket", {
      access: "public",
    });
    const table = new sst.aws.Dynamo("CharlieWadeTable", {
      fields: {
        chapter: "string",
      },
      primaryIndex: {
        hashKey: "chapter",
      },
    });
    const api = new sst.aws.ApiGatewayV2("CharlieWadeApi");

    api.route("GET /chapters", {
      link: [bucket],
      handler: "src/chapters.list",
    });

    api.route("GET /chapters/{name}", {
      link: [bucket],
      handler: "src/chapters.get",
    });

    api.route("PUT /chapters/{name}/page", {
      link: [bucket, table],
      handler: "src/chapters.handlePageChange",
    });

    api.route("GET /chapters/{name}/page", {
      link: [bucket, table],
      handler: "src/chapters.getLastReadPage",
    });

    new sst.aws.Cron("CharlieWadeSync", {
      function: {
        link: [bucket],
        handler: "src/chapters.sync",
        timeout: "900 seconds",
        storage: "1240 MB",
        memory: "512 MB",
      },
      enabled: ["production"].includes($app.stage),
      schedule: "rate(7 days)",
    });
  },
});
