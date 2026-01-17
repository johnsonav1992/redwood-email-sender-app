import { Mark, Node } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Paragraph from '@tiptap/extension-paragraph';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';

const styleAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute('style'),
  renderHTML: (attributes: Record<string, unknown>) => {
    if (!attributes.style) return {};
    return { style: attributes.style };
  },
};

const classAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute('class'),
  renderHTML: (attributes: Record<string, unknown>) => {
    if (!attributes.class) return {};
    return { class: attributes.class };
  },
};

const widthAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute('width'),
  renderHTML: (attributes: Record<string, unknown>) => {
    if (!attributes.width) return {};
    return { width: attributes.width };
  },
};

const heightAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute('height'),
  renderHTML: (attributes: Record<string, unknown>) => {
    if (!attributes.height) return {};
    return { height: attributes.height };
  },
};

const valignAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute('valign'),
  renderHTML: (attributes: Record<string, unknown>) => {
    if (!attributes.valign) return {};
    return { valign: attributes.valign };
  },
};

const alignAttribute = {
  default: null,
  parseHTML: (element: HTMLElement) => element.getAttribute('align'),
  renderHTML: (attributes: Record<string, unknown>) => {
    if (!attributes.align) return {};
    return { align: attributes.align };
  },
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
      class: classAttribute,
    };
  },
});

export const ParagraphWithStyles = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
    };
  },
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
      class: classAttribute,
    };
  },
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
        parseHTML: (element: HTMLElement) => element.hasAttribute('nowrap') ? 'nowrap' : null,
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.nowrap) return {};
          return { nowrap: '' };
        },
      },
    };
  },
});

export const TableHeaderWithStyles = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
      width: widthAttribute,
      valign: valignAttribute,
      align: alignAttribute,
    };
  },
});

export const TableRowWithStyles = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
    };
  },
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
        },
      },
      cellpadding: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('cellpadding'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.cellpadding) return {};
          return { cellpadding: attributes.cellpadding };
        },
      },
      cellspacing: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('cellspacing'),
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.cellspacing) return {};
          return { cellspacing: attributes.cellspacing };
        },
      },
    };
  },
});

export const LinkWithStyles = Link.extend({
  inclusive: false,
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
      class: classAttribute,
    };
  },
});

export const ImageWithStyles = Image.extend({
  inline: true,
  group: 'inline',
  addAttributes() {
    return {
      ...this.parent?.(),
      style: styleAttribute,
      width: widthAttribute,
      height: heightAttribute,
    };
  },
});
