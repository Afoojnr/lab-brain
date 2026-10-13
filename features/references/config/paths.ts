/** Where a reference's files live in storage, relative to the storage root. */
export const referenceFolder = (projectId: string, referenceId: string) =>
  `references/${projectId}/${referenceId}`;

export const referenceTextPath = (projectId: string, referenceId: string) =>
  `${referenceFolder(projectId, referenceId)}/text.txt`;

export const referenceFilePath = (projectId: string, referenceId: string) =>
  `${referenceFolder(projectId, referenceId)}/original.pdf`;
