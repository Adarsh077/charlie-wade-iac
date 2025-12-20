import * as cheerio from "cheerio";
import axios from "axios";

export const getLinks = async (lastChapterAdded) => {
  const response = await axios.get(
    "https://forum.3ptechies.com/threads/the-charismatic-charlie-wade-novel-pdf-online-free-download-online-viewing.1509/page-31#post-10844"
  );

  const $ = cheerio.load(response.data);
  const rawLinks = [];
  $(".file-preview").each((i, ele) => {
    let link = $(ele).attr("href");
    if (link.slice(-1) == "/") {
      link = link
        .split("")
        .splice(0, link.length - 1)
        .join("");
    }
    rawLinks.push(`https://forum.3ptechies.com${link}`);
  });

  const links = [];
  for (const link of rawLinks) {
    const number = +link.split("-").slice(-2)[0];
    if (number > lastChapterAdded) {
      links.push(link);
    }
  }

  return links;
};
