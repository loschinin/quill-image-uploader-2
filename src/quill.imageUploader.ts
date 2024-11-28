import LoadingImage from "./image";
import Quill from 'quill';

interface ImageUploaderOptions {
    upload: (file: File) => Promise<{ imageLink?: string; showBase64Image?: boolean }>;
}

interface QuillToolbar {
    addHandler: (name: string, handler: () => void) => void;
}

class ImageUploader {
    quill: Quill;
    options: ImageUploaderOptions;
    range: { index: number; length: number } | null;
    placeholderDelta: {
        ops: {
            retain?: number | Record<string, unknown> | undefined;
            insert?: string | Record<string, unknown> | undefined;
            attributes?: { [key: string]: unknown };
        }[];
    } | null;
    fileHolder: HTMLInputElement | undefined;

    constructor(quill: Quill, options: ImageUploaderOptions) {
        this.quill = quill;
        this.options = options;
        this.range = null;
        this.placeholderDelta = null;

        if (typeof this.options.upload !== 'function') {
            console.warn('[Missing config] upload function that returns a promise is required');
        }

        // Handler for the image upload button in the toolbar
        const toolbar = this.quill.getModule('toolbar') as QuillToolbar | null;
        if (toolbar) {
            toolbar.addHandler('image', this.selectLocalImage.bind(this));
        }

        // Bind event handlers for "drop" and "paste" events
        this.handleDrop = this.handleDrop.bind(this);
        this.handlePaste = this.handlePaste.bind(this);
        this.quill.root.addEventListener('drop', this.handleDrop, false);
        this.quill.root.addEventListener('paste', this.handlePaste, false);
    }

    // Handler for selecting a local image
    selectLocalImage() {
        this.quill.focus();
        this.range = this.quill.getSelection();

        // Create a hidden input element for image upload
        this.fileHolder = document.createElement('input');
        this.fileHolder.setAttribute('type', 'file');
        this.fileHolder.setAttribute('accept', 'image/*');
        this.fileHolder.setAttribute('style', 'visibility:hidden');
        this.fileHolder.onchange = this.fileChanged.bind(this);

        document.body.appendChild(this.fileHolder);
        this.fileHolder.click();

        window.requestAnimationFrame(() => {
            this.fileHolder && document.body.removeChild(this.fileHolder); // Удаляем элемент после клика
        });
    }

    // Handler for the "drop" event to insert images
    handleDrop(evt: DragEvent) {
        if (evt.dataTransfer && evt.dataTransfer.files && evt.dataTransfer.files.length) {
            evt.stopPropagation();
            evt.preventDefault();

            const selection = document.getSelection();
            // try to use not deprecated - caretPositionFromPoint
            const range = document.caretRangeFromPoint(evt.clientX, evt.clientY);
            if (selection && range) {
                selection.setBaseAndExtent(
                  range.startContainer,
                  range.startOffset,
                  range.startContainer,
                  range.startOffset
                );
            }

            this.quill.focus();
            this.range = this.quill.getSelection();
            let file = evt.dataTransfer.files[0];

            setTimeout(() => {
                this.quill.focus();
                this.range = this.quill.getSelection();
                this.readAndUploadFile(file);
            }, 0);
        }
    }

    // Handler for the "paste" event to insert images from the clipboard
    handlePaste(evt: ClipboardEvent) {
        // @ts-ignore
        let clipboard = evt.clipboardData || window.clipboardData;
        // IE 11 is .files other browsers are .items
        if (clipboard && (clipboard.items || clipboard.files)) {
            let items = clipboard.items || clipboard.files;
            const IMAGE_MIME_REGEX = /^image\/(jpe?g|gif|png|svg|webp)$/i;

            for (let i = 0; i < items.length; i++) {
                if (IMAGE_MIME_REGEX.test(items[i].type)) {
                    let file = items[i].getAsFile ? items[i].getAsFile() : items[i];

                    if (file) {
                        this.quill.focus();
                        this.range = this.quill.getSelection();
                        evt.preventDefault();
                        setTimeout(() => {
                            this.quill.focus();
                            this.range = this.quill.getSelection();
                            // @ts-ignore
                            this.readAndUploadFile(file);
                        }, 0);
                    }
                }
            }
        }
    }

    // Method for reading and uploading a file
    readAndUploadFile(file: File) {
        let isUploadReject = false;
        const fileReader = new FileReader();

        fileReader.addEventListener(
          'load',
          () => {
              if (!isUploadReject) {
                  let base64ImageSrc = fileReader.result;

                  typeof base64ImageSrc === 'string' && this.insertBase64Image(base64ImageSrc);
              }
          },
          false
        );

        if (file) {
            fileReader.readAsDataURL(file);
        }

        // Upload the file to the server
        this.options.upload(file).then(
          ({ imageLink, showBase64Image }) => {
              imageLink && this.insertToEditor(imageLink);
              !showBase64Image && this.removeBase64Image(); // Remove base64 image if showBase64Image is false
          },
          error => {
              isUploadReject = true;
              this.removeBase64Image();
          }
        );
    }

    // Handler for file changes in the input
    fileChanged() {
        const file = this.fileHolder?.files?.[0];
        if (file) {
            this.readAndUploadFile(file);
        }
    }

    // Insert a base64 image into the editor
    insertBase64Image(url: string) {
        const range = this.range;
        if (range) {
            // @ts-ignore
            this.placeholderDelta = this.quill.insertEmbed(
              range.index,
              LoadingImage.blotName,
              `${url}`,
              'user'
            );
        }
    }

    // Insert the image into the editor after successful upload
    insertToEditor(url: string) {
        const range = this.range;
        const lengthToDelete = this.calculatePlaceholderInsertLength();

        if (range) {
            // Remove the placeholder image
            this.quill.deleteText(range.index, lengthToDelete, 'user');
            // Insert the server image
            this.quill.insertEmbed(range.index, 'image', `${url}`, 'user');
            range.index++;
        }

        this.quill.setSelection(range, 'user');
    }

    // Calculate the length of the placeholder image
    calculatePlaceholderInsertLength() {
        // @ts-ignore
        return this.placeholderDelta.ops.reduce((accumulator, deltaOperation) => {
            if (deltaOperation.hasOwnProperty('insert')) accumulator++;
            return accumulator;
        }, 0);
    }

    // Remove the base64 image
    removeBase64Image() {
        const range = this.range;
        const lengthToDelete = this.calculatePlaceholderInsertLength();
        range && this.quill.deleteText(range.index, lengthToDelete, 'user');
    }
}

// Attach ImageUploader to the global object for debugging
// @ts-ignore
window.ImageUploader = ImageUploader;

export default ImageUploader;