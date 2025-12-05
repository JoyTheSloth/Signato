import cv2
import numpy as np

def create_test_signature(output_path="test_signature.jpg"):
    # Create a white background
    width, height = 800, 400
    image = np.ones((height, width, 3), dtype=np.uint8) * 255

    # Add some "paper" noise (light gray dots)
    noise = np.random.randint(240, 256, (height, width, 3), dtype=np.uint8)
    image = cv2.addWeighted(image, 0.8, noise, 0.2, 0)

    # Draw a "signature" (some random curves)
    # Using a dark gray color to simulate ink
    ink_color = (50, 50, 50) 
    
    # Draw some bezier-like curves (using polylines for simplicity)
    pts = np.array([[100, 200], [200, 100], [300, 250], [400, 150], [500, 200], [600, 300], [700, 200]], np.int32)
    pts = pts.reshape((-1, 1, 2))
    cv2.polylines(image, [pts], False, ink_color, thickness=3, lineType=cv2.LINE_AA)
    
    # Add a shadow/gradient to simulate bad lighting
    # Create a gradient mask
    gradient = np.tile(np.linspace(0, 50, width, dtype=np.uint8), (height, 1))
    gradient_img = np.zeros((height, width, 3), dtype=np.uint8)
    gradient_img[:, :, 0] = gradient
    gradient_img[:, :, 1] = gradient
    gradient_img[:, :, 2] = gradient
    
    # Darken the right side of the image
    image = cv2.subtract(image, gradient_img)

    cv2.imwrite(output_path, image)
    print(f"Created test signature at: {output_path}")

if __name__ == "__main__":
    create_test_signature()
