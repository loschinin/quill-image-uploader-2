import Quill from 'quill';

// Import the base class for working with block elements
const Block = Quill.import('blots/block');

// @ts-ignore
class LoadingImage extends Block {
  // Static method for creating an image element with src - base64
  static create(src) {
    // Create the base element using the parent method
    // @ts-ignore
    const node = super.create();
    // If the image source is a boolean `true`, simply return the element
    if (src === true) {
      return node;
    }

    const image = document.createElement('img');
    if (typeof src === 'string') {
      image.setAttribute('src', src);
    }
    node.appendChild(image); // Add the image to the node
    return node;
  }

  // Method for deleting content at the specified index and length
  deleteAt(index: number, length: number) {
    // @ts-ignore
    super.deleteAt(index, length); // Call the parent method to delete
    // @ts-ignore
    this.cache = {}; // Clear the cache
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
