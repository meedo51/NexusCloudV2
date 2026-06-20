import Image from '@tiptap/extension-image';

export const ExtendedImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute('width') || el.style.width || null,
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          return { width: attrs.width };
        },
      },
      height: {
        default: null,
        parseHTML: (el) => el.getAttribute('height') || el.style.height || null,
        renderHTML: (attrs) => {
          if (!attrs.height) return {};
          return { height: attrs.height };
        },
      },
      alignment: {
        default: 'center',
        parseHTML: (el) => el.getAttribute('data-alignment') || 'center',
        renderHTML: (attrs) => {
          if (!attrs.alignment || attrs.alignment === 'center') return {};
          return { 'data-alignment': attrs.alignment };
        },
      },
    };
  },
});
