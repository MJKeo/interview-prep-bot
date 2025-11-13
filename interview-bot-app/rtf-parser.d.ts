/**
 * Type declarations for the 'rtf-parser' module.
 * This module provides RTF (Rich Text Format) parsing functionality.
 */
declare module "rtf-parser" {
  /**
   * RTF document structure returned by the parser.
   */
  interface RTFDocument {
    content: RTFParagraph[];
  }

  /**
   * RTF paragraph structure.
   */
  interface RTFParagraph {
    content?: RTFSpan[];
  }

  /**
   * RTF text span structure.
   */
  interface RTFSpan {
    value: string;
  }

  /**
   * Callback function type for RTF parsing.
   */
  type RTFCallback = (err: Error | null, doc: RTFDocument | null) => void;

  /**
   * RTF parser interface.
   */
  interface RTFParser {
    /**
     * Parses an RTF string and calls the callback with the result.
     * @param rtfString - The RTF string to parse
     * @param callback - Callback function that receives the parsed document or error
     */
    string(rtfString: string, callback: RTFCallback): void;
  }

  /**
   * Default export: RTF parser instance.
   */
  const parseRTF: RTFParser;
  export default parseRTF;
}

