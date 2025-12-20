interface PdfInput {
  pageCount: number;
  fileName: string;
  link: string;
}

interface GroupOutput {
  links: string[];
  fileName: string;
  totalPages: number;
}

interface CurrentGroup {
  totalPages: number;
  elements: PdfInput[];
}

const main = async (pdfs: PdfInput[]): Promise<GroupOutput[]> => {
  const groups: GroupOutput[] = [];

  let currentGroup: CurrentGroup = {
    totalPages: 0,
    elements: [],
  };

  for (const index in pdfs) {
    // In TS, 'index' in a for-in loop is a string.
    // Converting to number to access the array without implicit 'any' error.
    const pdf = pdfs[Number(index)];

    currentGroup.elements.push(pdf);
    currentGroup.totalPages += pdf.pageCount;

    if (currentGroup.totalPages > 200 || +index === pdfs.length - 1) {
      const firstElement = currentGroup.elements[0];
      const lastElement =
        currentGroup.elements[currentGroup.elements.length - 1];

      const firstChapterNumber = firstElement.fileName.split("chapter-")[1];
      const lastChapterNumber = lastElement.fileName.split("chapter-")[1];

      groups.push({
        links: currentGroup.elements.map((ele) => ele.link),
        fileName:
          currentGroup.elements.length === 1
            ? `chapter-${firstChapterNumber}.pdf`
            : `chapter-${firstChapterNumber}-${lastChapterNumber}.pdf`,
        totalPages: currentGroup.totalPages,
      });
      currentGroup = {
        totalPages: 0,
        elements: [],
      };
    }
  }

  return groups;
};

export default main;
