import Quill from 'quill';

// Import the base class for working with block elements
const InlineBlot = Quill.import('blots/block') as any;

// @ts-ignore
class LoadingImage extends InlineBlot {
  // Static method for creating an image element with src - base64
  static create(src: string | boolean) {
    // Create the base element using the parent method
    // @ts-ignore
    const node = super.create(src);

    // If the image source is a boolean `true`, simply return the element
    if (src === true) {
      return node;
    }

    // Create an img element and set the src attribute
    const image = document.createElement('img');
    typeof src === 'string' && image.setAttribute('src', src);
    node.appendChild(image); // Добавляем изображение в узел
    return node;
  }

  // Method for deleting content at the specified index and length
  deleteAt(index: number, length: number) {
    // @ts-ignore
    super.deleteAt(index, length); // Call the parent method to delete
    // @ts-ignore
    this.cache = {}; // Clear the cache (this property is assumed to be defined elsewhere)
  }

  // Static method for getting the value of an element from the DOM node
  static value(domNode: HTMLElement) {
    const { src, custom } = domNode.dataset; // Extract values from the data-src and data-custom attributes
    return { src, custom }; // Return an object with the extracted data
  }
}

// @ts-ignore
LoadingImage.blotName = 'imageBlot'; // Set the blot name

// @ts-ignore
LoadingImage.className = 'image-uploading'; // Set the CSS class name

// @ts-ignore
LoadingImage.tagName = 'span'; // Set the tag name

// Register the custom format for Quill
Quill.register({ 'formats/imageBlot': LoadingImage });

export default LoadingImage;
