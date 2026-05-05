import numpy as np
import tensorflow as tf
from PIL import Image

interpreter = tf.lite.Interpreter(model_path="quantized_model.tflite")
interpreter.allocate_tensors()
input_index = interpreter.get_input_details()[0]["index"]
output_index = interpreter.get_output_details()[0]["index"]

def classify_image(image: Image.Image):
    image = image.resize((128, 128))
    img = np.array(image).astype(np.float32) / 255.0
    img = np.expand_dims(img, axis=0)

    interpreter.set_tensor(input_index, img)
    interpreter.invoke()
    output = interpreter.get_tensor(output_index)

    return int(np.argmax(output))
