import type { Bookmark } from "@/types/bookmarks";
import type { EditorMode, TextDirection } from "@/types/editor";

export interface TrashEntry {
  /** Original document id, reused on restore. */
  id: string;
  title: string;
  filePath: string | null;
  language: string | null;
  direction: TextDirection;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  isPinned: boolean;
  isBookmarked: boolean;
  mode: EditorMode;
  content: string;
  /** Original group the document belonged to, so restore puts it back. */
  groupId: string;
  /** Snapshot of the document's bookmarks at delete time. */
  bookmarks: Bookmark[];
}
