import { Resource } from "sst";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({});

export const getLastAddedChapterNumber = async () => {
  const objects = await s3.send(
    new ListObjectsV2Command({
      Bucket: Resource.CharlieWadeBucket.name,
    })
  );

  const chapters = (objects.Contents || []).map((content) => ({
    name: content.Key,
    size: content.Size,
  }));

  let lastChapter = 0;

  for (const chapter of chapters) {
    try {
      const number = +chapter.name.split("-").slice(-1)[0].split(".pdf")[0];
      if (lastChapter < number) {
        lastChapter = number;
      }
    } catch (error) {
      console.log(error);
    }
  }

  return lastChapter || null;
};
