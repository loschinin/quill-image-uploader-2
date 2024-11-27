import LoadingImage from "./blots/image.js";
import Quill from 'quill';

interface ImageUploaderOptions {
    upload: (file: File) => Promise<{ imageLink: string; showBase64Image?: boolean }>;
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

        // Обработчик для кнопки добавления изображения в тулбаре
        const toolbar = this.quill.getModule('toolbar') as QuillToolbar | null;
        if (toolbar) {
            toolbar.addHandler('image', this.selectLocalImage.bind(this));
        }

        // Привязываем обработчики для событий "drop" и "paste"
        this.handleDrop = this.handleDrop.bind(this);
        this.handlePaste = this.handlePaste.bind(this);
        this.quill.root.addEventListener('drop', this.handleDrop, false);
        this.quill.root.addEventListener('paste', this.handlePaste, false);
    }

    // Обработчик для выбора локального изображения
    selectLocalImage() {
        this.quill.focus();
        this.range = this.quill.getSelection();

        // Создание скрытого элемента input для загрузки изображения
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

    // Обработчик события "drop" для вставки изображений
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

    // Обработчик события "paste" для вставки изображений из буфера обмена
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
                            this.readAndUploadFile(file);
                        }, 0);
                    }
                }
            }
        }
    }

    // Метод для чтения и загрузки файла
    readAndUploadFile(file: File) {
        let isUploadReject = false;
        const fileReader = new FileReader();

        fileReader.addEventListener(
            'load',
            () => {
                if (!isUploadReject) {
                    let base64ImageSrc = fileReader.result;

                    typeof base64ImageSrc === 'string' && this.insertBase64Image(base64ImageSrc); // Вставляем base64 изображение
                }
            },
            false
        );

        if (file) {
            fileReader.readAsDataURL(file);
        }

        // Загружаем файл на сервер
        this.options.upload(file).then(
            ({ imageLink, showBase64Image }) => {
                this.insertToEditor(imageLink);
                !showBase64Image && this.removeBase64Image(); // Удаляем base64 изображение если нет showBase64Image
            },
            error => {
                isUploadReject = true;
                this.removeBase64Image();
            }
        );
    }

    // Обработчик изменения файла в input
    fileChanged() {
        const file = this.fileHolder?.files?.[0];
        if (file) {
            this.readAndUploadFile(file);
        }
    }

    // Вставка base64 изображения в редактор
    insertBase64Image(url: string) {
        const range = this.range;
        if (range) {
            this.placeholderDelta = this.quill.insertEmbed(
                range.index,
                LoadingImage.blotName,
                `${url}`,
                'user'
            );
        }
    }

    // Вставка изображения в редактор после успешной загрузки
    insertToEditor(url: string) {
        const range = this.range;
        const lengthToDelete = this.calculatePlaceholderInsertLength();

        if (range) {
            // Удаляем placeholder изображение
            this.quill.deleteText(range.index, lengthToDelete, 'user');
            // Вставляем серверное изображение
            this.quill.insertEmbed(range.index, 'image', `${url}`, 'user');
            range.index++;
        }

        this.quill.setSelection(range, 'user');
    }

    // Вычисление длины placeholder изображения
    calculatePlaceholderInsertLength() {
        // @ts-ignore
        return this.placeholderDelta.ops.reduce((accumulator, deltaOperation) => {
            if (deltaOperation.hasOwnProperty('insert')) accumulator++;
            return accumulator;
        }, 0);
    }

    // Удаление base64 изображения
    removeBase64Image() {
        const range = this.range;
        const lengthToDelete = this.calculatePlaceholderInsertLength();
        range && this.quill.deleteText(range.index, lengthToDelete, 'user');
    }
}

// Привязываем ImageUploader к глобальному объекту для отладки
// @ts-ignore
window.ImageUploader = ImageUploader;

export default ImageUploader;