/**
 * LinkDit Pad — bookmark domain type.
 */

export interface Bookmark {
  /** Unique id (uuid). */
  id: string;
  /** User-defined name for the bookmark. */
  name: string;
  /** The document (tab) this bookmark belongs to. */
  fileId: string;
  /** Absolute character offset in the document text where the bookmark sits. */
  position: number;
  /** 1-based line number (kept in sync with the document). */
  lineNumber: number;
  /** 0-based column inside the line. */
  charPosition: number;
  /** ISO creation timestamp. */
  createdAt: string;
}