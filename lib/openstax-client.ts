const OS_HOST = "https://openstax.org";
const CMS_API = `${OS_HOST}/apps/cms/api/v2`;
const REX_RELEASE = `${OS_HOST}/rex/release.json`;

export type OsBookMeta = {
  slug: string;
  title: string;
  subject: string;
  cnxId: string;
};

export type TocSection = {
  id: string;
  title: string;
  order: number;
};

export type TocChapter = {
  id: string;
  chapterNumber: number;
  title: string;
  sections: TocSection[];
};

export type BookToc = {
  bookVersion: string;
  chapters: TocChapter[];
};

type RexManifest = {
  archiveUrl: string;
  books: Record<string, { defaultVersion: string; retired?: boolean }>;
};

type ArchiveTocNode = {
  id: string;
  title: string;
  contents?: ArchiveTocNode[] | null;
};

async function fetchRexManifest(): Promise<RexManifest> {
  const res = await fetch(REX_RELEASE, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`OpenStax release manifest returned ${res.status}`);
  return (await res.json()) as RexManifest;
}

export async function fetchOpenstaxCatalog(): Promise<OsBookMeta[]> {
  const res = await fetch(
    `${CMS_API}/pages/?type=books.Book&fields=title,cnx_id&limit=200`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`OpenStax catalog API returned ${res.status}`);
  const raw = await res.json() as { items?: Record<string, unknown>[] };

  return (raw.items ?? [])
    .filter((b) => b.cnx_id)
    .map((b) => ({
      slug: ((b.meta as Record<string, unknown>)?.slug ?? "") as string,
      title: (b.title ?? "") as string,
      subject: "",
      cnxId: (b.cnx_id ?? "") as string,
    }))
    .filter((b) => b.slug);
}

export async function fetchBookToc(cnxId: string): Promise<BookToc> {
  const manifest = await fetchRexManifest();
  const entry = manifest.books[cnxId];
  if (!entry) throw new Error(`Book ${cnxId} not in OpenStax release manifest`);
  if (entry.retired) throw new Error(`Book ${cnxId} is retired`);

  const url = `${OS_HOST}${manifest.archiveUrl}/contents/${cnxId}@${entry.defaultVersion}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Archive API returned ${res.status} for ${cnxId}`);
  const data = await res.json() as { tree: ArchiveTocNode };

  return {
    bookVersion: entry.defaultVersion,
    chapters: parseToc(data.tree),
  };
}

export async function fetchSectionHtml(
  cnxId: string,
  bookVersion: string,
  pageId: string,
): Promise<string> {
  const manifest = await fetchRexManifest();
  const url = `${OS_HOST}${manifest.archiveUrl}/contents/${cnxId}@${bookVersion}:${pageId}.json`;
  const res = await fetch(url);
  if (!res.ok) return "";
  const data = await res.json() as { content?: string };
  return data.content ?? "";
}

function extractPageId(compositeId: string): string {
  // Archive returns leaf ids as "<page-uuid>@" or "<book>@<ver>:<page-uuid>@<ver>"
  const afterColon = compositeId.includes(":") ? compositeId.split(":")[1] : compositeId;
  return afterColon.split("@")[0];
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function parseToc(tree: ArchiveTocNode): TocChapter[] {
  const topLevel = tree.contents ?? [];
  const chapters: TocChapter[] = [];
  let chapterNum = 0;

  for (const node of topLevel) {
    if (!node.contents?.length) continue; // skip leaf nodes at top level (preface pages)

    chapterNum++;
    const sections: TocSection[] = node.contents
      .filter((p) => !p.contents?.length)
      .map((p, i) => ({
        id: extractPageId(p.id),
        title: stripHtml(p.title),
        order: i,
      }));

    chapters.push({
      id: extractPageId(node.id),
      chapterNumber: chapterNum,
      title: stripHtml(node.title),
      sections,
    });
  }

  return chapters;
}
