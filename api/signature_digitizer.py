import cv2
import numpy as np
import argparse
import os
import sys

class SignatureDigitizer:
    def __init__(self, input_source):
        """
        input_source: Can be a file path (str) or an image array (numpy.ndarray).
        """
        self.image_path = None
        self.original_image = None
        self.image = None

        if isinstance(input_source, str):
            self.image_path = input_source
            if not os.path.exists(input_source):
                raise FileNotFoundError(f"Input file not found: {input_source}")
        elif isinstance(input_source, np.ndarray):
             self.original_image = input_source
             self.image = self.original_image.copy()
        else:
            raise ValueError("Invalid input source. Must be a file path or numpy array.")

    def load_image(self):
        """Loads the image from disk if path was provided."""
        if self.original_image is not None:
            return # Already loaded from memory

        if self.image_path:
            self.original_image = cv2.imread(self.image_path)
            if self.original_image is None:
                raise ValueError("Could not load image. Please check the file format.")
            self.image = self.original_image.copy()

    def process(self, ink_color='black'):
        """
        Main processing pipeline:
        1. Convert to Grayscale
        2. Denoise
        3. Threshold/Segment
        4. Make Transparent
        5. Colorize
        """
        if self.image is None:
            self.load_image()

        # 1. Convert to Grayscale
        gray = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)

        # 2. Denoise (Gaussian Blur to smooth edges slightly and reduce noise)
        # Using a small kernel to preserve details
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # 3. Segmentation (Adaptive Thresholding)
        # This helps in handling varying lighting conditions (shadows)
        # blockSize=11, C=2 are common starting points
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )

        # Optional: Morphological operations to remove small noise dots
        kernel = np.ones((2,2), np.uint8)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)

        # Check if signature is too faint or empty
        if np.sum(thresh) == 0:
            raise ValueError("No signature detected or image is too low quality.")

        # 4. Make Transparent & 5. Colorize
        # Create an RGBA image
        h, w = thresh.shape
        output_img = np.zeros((h, w, 4), dtype=np.uint8)

        # Define ink color
        if ink_color == 'blue':
            # Royal Deep Blue: (B, G, R) - Approx #002366 or #4169E1
            # Let's use a rich Royal Blue: (225, 105, 65) -> #4169E1 (RoyalBlue) in BGR
            # Or deeper: (139, 0, 0) was DarkBlue. Let's go for (200, 50, 0)
            color_val = (180, 20, 0) # Deep Royal Blue BGR 
        else:
            # Black
            color_val = (0, 0, 0)

        # Where thresh is white (255) -> it's ink (because we used BINARY_INV)
        # Set color and alpha
        # We can use the threshold value as the alpha mask for smoother edges if we didn't binary inv so hard,
        # but adaptive threshold gives binary. 
        # To get smoother edges, we could use the blurred gray image as a mask, but let's stick to the clean binary for now.
        
        # Get coordinates of ink pixels
        # np.where returns a tuple of arrays, one for each dimension
        y_indices, x_indices = np.where(thresh > 0)
        
        # Assign to all masked pixels using integer array indexing
        # This is the most compatible way to assign values
        output_img[y_indices, x_indices] = [color_val[0], color_val[1], color_val[2], 255]
        
        # Background is already (0,0,0,0) which is transparent black.

        self.image = output_img
        return output_img

    def save(self, output_path):
        if self.image is None:
            raise ValueError("No processed image to save.")
        cv2.imwrite(output_path, self.image)
        print(f"Saved digitized signature to: {output_path}")

def main():
    parser = argparse.ArgumentParser(description="Digitize a handwritten signature from an image.")
    parser.add_argument("input_image", help="Path to the input image file.")
    parser.add_argument("--output", "-o", help="Path to the output PNG file.", default="digitized_signature.png")
    parser.add_argument("--color", "-c", choices=["black", "blue"], default="black", help="Ink color for the output signature.")
    
    args = parser.parse_args()

    print("--- Signature Digitization Tool ---")
    print("DISCLAIMER: This tool is for digitizing your own signature. Do not use it to imitate or forge others' signatures.")
    
    try:
        digitizer = SignatureDigitizer(args.input_image)
        digitizer.process(ink_color=args.color)
        digitizer.save(args.output)
        
        # Output metadata
        h, w, _ = digitizer.image.shape
        print(f"Metadata: {{ 'ink_color': '{args.color}', 'width_px': {w}, 'height_px': {h} }}")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
