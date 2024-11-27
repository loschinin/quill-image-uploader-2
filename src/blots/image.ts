import Quill from 'quill';

// Импортируем базовый класс для работы с блочными элементами
const InlineBlot = Quill.import('blots/block') as any;

class LoadingImage extends InlineBlot {
    // Статический метод для создания элемента изображения src - base64
    static create(src: string | boolean) {
        // Создаём базовый элемент с помощью родительского метода
        const node = super.create(src);

        // Если источник изображения является булевым значением `true`, просто возвращаем элемент
        if (src === true) {
            return node;
        }

        // Создаём элемент img и добавляем атрибут src
        const image = document.createElement('img');
        typeof src === 'string' && image.setAttribute('src', src);
        node.appendChild(image); // Добавляем изображение в узел
        return node;
    }

    // Метод для удаления содержимого на указанном индексе и длине
    deleteAt(index: number, length: number) {
        super.deleteAt(index, length); // Вызываем родительский метод для удаления
        this.cache = {}; // Очищаем кеш (предполагается, что это свойство будет определено в другом месте)
    }

    // Статический метод для получения значения элемента из DOM-узла
    static value(domNode: HTMLElement) {
        const { src, custom } = domNode.dataset; // Извлекаем значения атрибутов data-src и data-custom
        return { src, custom }; // Возвращаем объект с извлечёнными данными
    }
}

LoadingImage.blotName = 'imageBlot'; // Устанавливаем имя для блота

LoadingImage.className = 'image-uploading'; // Устанавливаем имя CSS-класса

LoadingImage.tagName = 'span'; // Устанавливаем имя тега

// Регистрируем кастомный формат для Quill
Quill.register({ 'formats/imageBlot': LoadingImage });

export default LoadingImage;
