import { Resource } from "sst";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

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

export const get = async (events) => {
  const filename = events?.pathParameters?.name;

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
