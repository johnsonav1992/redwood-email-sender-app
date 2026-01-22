import { Mark, Node } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Paragraph from '@tiptap/extension-paragraph';
import {
  Table,
  TableRow,
  TableCell,
  TableHeader
} from '@tiptap/extension-table';

const styleAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute('style'),
  renderHTML: (attributes: Record<string, unknown>) => {
    if (!attributes.style) return {};
    return { style: attributes.style };
  }
};

const classAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute('class'),
  renderHTML: (attributes: Record<string, unknown>) => {
    if (!attributes.class) return {};
    return { class: attributes.class };
  }
};

const widthAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute('width'),
  renderHTML: (attributes: Record<string, unknown>) => {
    if (!attributes.width) return {};
    return { width: attributes.width };
  }
};

const heightAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute('height'),
  renderHTML: (attributes: Record<string, unknown>) => {
    if (!attributes.height) return {};
    return { height: attributes.height };
  }
};

const valignAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute('valign'),
  renderHTML: (attributes: Record<string, unknown>) => {
    if (!attributes.valign) return {};
    return { valign: attributes.valign };
  }
};

const alignAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute('align'),
  renderHTML: (attributes: Record<string, unknown>) => {
    if (!attributes.align) return {};
    return { align: attributes.align };
  }
};

export const SpanMark = Mark.create({
  name: 'span',
  parseHTML() {
    return [{ tag: 'span' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  },
  addAttributes() {
    return {
      style: styleAttribute,
      class: classAttribute
    };
  }
});

export const ParagraphWithStyles = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute
    };
  }
});

export const DivNode = Node.create({
  name: 'div',
  group: 'block',
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'div' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', HTMLAttributes, 0];
  },
  addAttributes() {
    return {
      style: styleAttribute,
      class: classAttribute
    };
  }
});

export const TableCellWithStyles = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
      width: widthAttribute,
      valign: valignAttribute,
      align: alignAttribute,
      nowrap: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.hasAttribute('nowrap') ? 'nowrap' : null,
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.nowrap) return {};
          return { nowrap: '' };
        }
      }
    };
  }
});

export const TableHeaderWithStyles = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
      width: widthAttribute,
      valign: valignAttribute,
      align: alignAttribute
    };
  }
});

export const TableRowWithStyles = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute
    };
  }
});

export const TableWithStyles = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
      width: widthAttribute,
      border: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('border'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.border) return {};
          return { border: attributes.border };
        }
      },
      cellpadding: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('cellpadding'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.cellpadding) return {};
          return { cellpadding: attributes.cellpadding };
        }
      },
      cellspacing: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('cellspacing'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.cellspacing) return {};
          return { cellspacing: attributes.cellspacing };
        }
      }
    };
  }
});

export const LinkWithStyles = Link.extend({
  inclusive: false,
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style'),
        renderHTML: (attributes: Record<string, unknown>) => {
          const existingStyle = attributes.style as string | null;
          const baseStyle =
            'color: inherit; text-decoration: none; cursor: pointer;';
          const finalStyle = existingStyle
            ? `${baseStyle} ${existingStyle}`
            : baseStyle;
          return { style: finalStyle };
        }
      },
      class: classAttribute
    };
  }
});

// Image extension WITH resize handles (for email body editor)
export const ImageWithResize = Image.configure({
  inline: true,
  allowBase64: true,
  resize: {
    enabled: true,
    directions: ['bottom-left', 'bottom-right', 'top-left', 'top-right'],
    minWidth: 50,
    minHeight: 50,
    alwaysPreserveAspectRatio: true
  }
}).extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style'),
        renderHTML: (attributes: Record<string, unknown>) => {
          const existingStyle = attributes.style as string | null;

          // Always include base display properties
          let baseStyle = 'display: inline; vertical-align: middle;';

          // Check if style already contains width/height (from resize)
          const hasExplicitDimensions =
            existingStyle &&
            (existingStyle.includes('width:') ||
              existingStyle.includes('height:'));

          if (!hasExplicitDimensions) {
            // No explicit dimensions, use responsive defaults
            baseStyle += ' max-width: 100%; height: auto;';
          }

          const finalStyle = existingStyle
            ? `${baseStyle} ${existingStyle}`
            : baseStyle;
          return { style: finalStyle };
        }
      },
      width: widthAttribute,
      height: heightAttribute,
      href: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const parent = element.parentElement;
          if (parent?.tagName === 'A') {
            return parent.getAttribute('href');
          }
          return element.getAttribute('href');
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.href) return {};
          return { href: attributes.href };
        }
      },
      target: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const parent = element.parentElement;
          if (parent?.tagName === 'A') {
            return parent.getAttribute('target');
          }
          return element.getAttribute('target');
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.target) return {};
          return { target: attributes.target };
        }
      }
    };
  },
  renderHTML({ HTMLAttributes }) {
    const { href, target, ...imgAttributes } = HTMLAttributes;

    if (href) {
      const linkAttrs: Record<string, string> = { href };
      if (target) linkAttrs.target = target;

      return ['a', linkAttrs, ['img', imgAttributes]];
    }

    return ['img', imgAttributes];
  }
});

// Image extension WITHOUT resize (for signature editor)
export const ImageWithStyles = Image.extend({
  inline: true,
  group: 'inline',
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('style'),
        renderHTML: (attributes: Record<string, unknown>) => {
          const existingStyle = attributes.style as string | null;

          // Always include base display properties
          let baseStyle = 'display: inline; vertical-align: middle;';

          // Check if style already contains width/height (from resize)
          const hasExplicitDimensions =
            existingStyle &&
            (existingStyle.includes('width:') ||
              existingStyle.includes('height:'));

          if (!hasExplicitDimensions) {
            // No explicit dimensions, use responsive defaults
            baseStyle += ' max-width: 100%; height: auto;';
          }

          const finalStyle = existingStyle
            ? `${baseStyle} ${existingStyle}`
            : baseStyle;
          return { style: finalStyle };
        }
      },
      width: widthAttribute,
      height: heightAttribute,
      href: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const parent = element.parentElement;
          if (parent?.tagName === 'A') {
            return parent.getAttribute('href');
          }
          return element.getAttribute('href');
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.href) return {};
          return { href: attributes.href };
        }
      },
      target: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const parent = element.parentElement;
          if (parent?.tagName === 'A') {
            return parent.getAttribute('target');
          }
          return element.getAttribute('target');
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.target) return {};
          return { target: attributes.target };
        }
      }
    };
  },
  renderHTML({ HTMLAttributes }) {
    const { href, target, ...imgAttributes } = HTMLAttributes;

    if (href) {
      const linkAttrs: Record<string, string> = { href };
      if (target) linkAttrs.target = target;

      return ['a', linkAttrs, ['img', imgAttributes]];
    }

    return ['img', imgAttributes];
  }
});
