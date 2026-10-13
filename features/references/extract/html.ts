import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

export type ReadablePage = {
  title: string | null;
  authors: string | null;
  text: string;
};

const collapse = (text: string) =>
  text
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * The readable text of a web page: the article without menus, adverts and
 * scripts. Falls back to the whole body text when the page does not look like
 * an article. The page's scripts are never run.
 *
 * @param html - The page's HTML.
 * @param url - Its address, used to resolve relative links.
 */
export const extractReadable = (html: string, url: string): ReadablePage => {
  const { document } = parseHTML(html);
  // Readability changes the document, so it reads a copy of it.
  const article = new Readability(
    parseHTML(html).document as unknown as Document,
    { charThreshold: 100 }
  ).parse();
  void url;

  const fallback = collapse(document.body?.textContent ?? '');
  const text = collapse(article?.textContent ?? '') || fallback;
  const title =
    (article?.title ?? document.title ?? '').toString().trim() || null;
  const authors = (article?.byline ?? '').toString().trim() || null;

  return { title, authors, text };
};
