# Quill-2 TS Image Uploader
## quill-2-image-uploader-base64-off 
### - Replacing base64 Image after uploading with img src="your-link"

Adaptation for using Quill-2 and react-quill-new


A module for Quill rich text editor to allow images to be uploaded to a server instead of being base64 encoded.
Adds a button to the toolbar for users to click, also handles drag,dropped and pasted images.

![Image of Yaktocat](/static/quill-example.gif)

### Quickstart (React with react-quill-new)
### Install

Install with npm:

    ```bash
        npm i quill-2-image-uploader-base64-off
        npm i quill
        npm i react-quill-new


```tsx
import ReactQuill, { Quill } from 'react-quill-new';
import ImageUploader from 'quill-2-image-uploader-base64-off';
import Emitter from 'quill/core/emitter';

import 'quill-image-uploader/dist/quill.imageUploader.min.css';
import { useRef } from 'react';

Quill.register('modules/imageUploader', ImageUploader);

const Scroll = Quill.import('blots/scroll') as any;

// Fix for Quill-2 to dnd inside textarea after paste or drop
class DraggableScroll extends Scroll {
  constructor(
    registry: { attributes: any; classes: any; tags: any; types: any },
    domNode: HTMLElement,
    { emitter }: { emitter: Emitter }
  ) {
    super(registry, domNode, { emitter });

    this.domNode?.addEventListener('drop', (e: DragEvent) => this.handleDrop(e), true);
  }

  handleDrop(e: DragEvent) {
    if (!e.dataTransfer?.files.length) e.stopImmediatePropagation();
  }

  handleDragStart() {}
}

// @ts-ignore
Quill.register(DraggableScroll);

interface IProps {
  classes?: string;
  theme?: string;
  text?: string;
  placeholder?: string;
  setContent?: (content: string) => void;
}

export const MyComponent = ({ classes, theme, text, placeholder, setContent }: IProps) => {
  const ref = useRef(null)
  return (
    <ReactQuill
      className={classes}
      theme={theme}
      value={text}
      onChange={(text, delta, source) => {
        if (source === 'user') {
          setContent?.(text);
        }
      }}
      modules={{
        toolbar: {
          container: [['link'], ['image']],
        },
        clipboard: {
          matchVisual: false,
        },
        imageResize: {
          parchment: Quill.import('parchment'),
            // U can add custom ImageResizeModuleToolbar
            modules: ['Resize', 'DisplaySize'], 
        },
        imageUploader: {
          upload: async (file: File) => {
            // pass your img link or set showBase64Image true to see base64img inside textarea
            return { imageLink: 'img link', showBase64Image: false };
          },
        },
      }}
      formats={['header', 'font', 'size']}
      ref={ref}
      readOnly={false}
      placeholder={placeholder}
    />
  );
};

```

### If warnings in console, check this formats:
#### 'imageBlot', // #5 Optinal if using custom formats
#### 'sub',
#### 'super',
#### 'width',
#### 'alt',
#### 'bullet',