import * as fs from "fs";

/**
 * Deletes a folder if it exists and creates a new empty one.
 * @param folderPath - The path of the folder to create.
 */
function createFolder(folderPath: string): void {
  if (fs.existsSync(folderPath)) {
    console.log(`Deleting existing folder: ${folderPath}`);
    fs.rmSync(folderPath, { recursive: true, force: true });
  }

  try {
    fs.mkdirSync(folderPath);
    console.log(`Created the folder: ${folderPath}`);
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;

    if (error.code === "EEXIST") {
      console.log("Error: Folder already exists");
    } else {
      throw err;
    }
  }
}

export default createFolder;
