import { Resource } from "sst";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

import {
  getLastAddedChapterNumber,
  getLinks,
  calculateTotalPages,
  groupPdfs,
  downloadAndMergePdf,
} from "./utils";

const s3 = new S3Client({});

export const list = async () => {
  const objects = await s3.send(
    new ListObjectsV2Command({
      Bucket: Resource.CharlieWadeBucket.name,
    })
  );

  const chapters = (objects.Contents || []).map((content) => ({
    name: content.Key,
    size: content.Size,
  }));

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "success",
      body: { chapters },
    }),
  };
};

export const get = async (event) => {
  const filename = event?.pathParameters?.name;

  if (!filename) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        status: "error",
        message: "name is required.",
      }),
    };
  }

  const command = new GetObjectCommand({
    Key: filename,
    Bucket: Resource.CharlieWadeBucket.name,
  });

  const url = await getSignedUrl(s3, command);

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "success",
      body: { url },
    }),
  };
};

export const handlePageChange = async (event) => {
  const filename = event?.pathParameters?.name;

  if (!filename) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        status: "error",
        message: "name is required.",
      }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "page is required!",
      }),
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { page } = requestBody;

  const client = new DynamoDBClient();
  const docClient = DynamoDBDocumentClient.from(client);

  const getLastReadPageCommand = new GetCommand({
    TableName: Resource.CharlieWadeTable.name,
    Key: {
      chapter: filename,
    },
  });

  const response = await docClient.send(command);

  if (response.Item) {
    if (response.Item.page >= page) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: "success",
        }),
      };
    }
  }


  const command = new PutCommand({
    TableName: Resource.CharlieWadeTable.name,
    Item: {
      chapter: filename,
      page,
    },
  });

  try {
    await docClient.send(command);
  } catch (error) {
    console.log(error);
    return { statusCode: 400 };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "success",
    }),
  };
};

export const getLastReadPage = async (event) => {
  const filename = event?.pathParameters?.name;

  if (!filename) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        status: "error",
        message: "name is required.",
      }),
    };
  }

  const client = new DynamoDBClient({ region: "ap-south-1" });
  const docClient = DynamoDBDocumentClient.from(client);

  const command = new GetCommand({
    TableName: Resource.CharlieWadeTable.name,
    Key: {
      chapter: filename,
    },
  });

  const response = await docClient.send(command);

  if (!response.Item) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "success",
        body: { page: 1 },
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "success",
      body: { page: response.Item.page },
    }),
  };
};

export const sync = async () => {
  const lastChapterAdded = await getLastAddedChapterNumber();

  console.log({ lastChapterAdded });

  const links = await getLinks(lastChapterAdded);
  console.log({ links });

  if (!links.length) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "success",
        body: [],
      }),
    };
  }

  const pdfsWithPageCount = await calculateTotalPages(links);
  console.log({ pdfsWithPageCount });

  const pdfs = await groupPdfs(pdfsWithPageCount);

  const response = await downloadAndMergePdf(pdfs);

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "success",
      body: response,
    }),
  };
};
