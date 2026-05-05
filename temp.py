import tensorflow as tf
from tensorflow.keras.layers import (Conv2D, MaxPooling2D, GlobalAveragePooling1D,
                                     Dense, Dropout, LayerNormalization, MultiHeadAttention,
                                     Input, Reshape)
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
import matplotlib.pyplot as plt
import os



# Configuration
img_size = 128
batch_size = 32

# Custom CNN block (keeps accuracy high)
def custom_cnn(x):
    x = Conv2D(16, (3, 3), activation='relu', padding='same')(x)
    x = MaxPooling2D()(x)

    x = Conv2D(32, (3, 3), activation='relu', padding='same')(x)
    x = MaxPooling2D()(x)

    x = Conv2D(64, (3, 3), activation='relu', padding='same')(x)
    x = MaxPooling2D()(x)

    x = Conv2D(128, (3, 3), activation='relu', padding='same')(x)
    x = MaxPooling2D()(x)

    return x

#  Transformer block (preserve attention capacity)
def tiny_transformer_block(x, embed_dim=128, num_heads=2, ff_dim=256, dropout=0.1):
    attn_output = MultiHeadAttention(num_heads=num_heads, key_dim=embed_dim)(x, x)
    attn_output = Dropout(dropout)(attn_output)
    x = LayerNormalization(epsilon=1e-6)(x + attn_output)

    ffn_output = tf.keras.Sequential([
        Dense(ff_dim, activation='relu'),
        Dense(embed_dim),
    ])(x)
    ffn_output = Dropout(dropout)(ffn_output)
    x = LayerNormalization(epsilon=1e-6)(x + ffn_output)
    return x


#  Final model
def build_model(num_classes):
    inputs = Input(shape=(img_size, img_size, 3))
    x = custom_cnn(inputs)                       # Output shape ≈ (8x8x128)
    x = Reshape((64, 128))(x)                    # Flatten spatial → sequence
    x = tiny_transformer_block(x)
    x = GlobalAveragePooling1D()(x)
    x = Dense(64, activation='relu')(x)
    x = Dropout(0.3)(x)
    outputs = Dense(num_classes, activation='softmax')(x)
    return Model(inputs, outputs)

# Paths (Colab storage)
train_path = "/content/PlantDiseaseProject/Train"
val_path = "/content/PlantDiseaseProject/Validation"

# Data augmentation
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=20,
    zoom_range=0.2,
    shear_range=0.2,
    width_shift_range=0.2,
    height_shift_range=0.2,
    horizontal_flip=True
)
val_datagen = ImageDataGenerator(rescale=1./255)

train_data = train_datagen.flow_from_directory(
    train_path,
    target_size=(img_size, img_size),
    batch_size=batch_size,
    class_mode='categorical',
    shuffle=True
)
val_data = val_datagen.flow_from_directory(
    val_path,
    target_size=(img_size, img_size),
    batch_size=batch_size,
    class_mode='categorical'
)


# Build and compile
model = build_model(num_classes=train_data.num_classes)
model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

# Callbacks
checkpoint = ModelCheckpoint(
    "/content/drive/MyDrive/PlantDiseaseProject/model_accurate_compact.keras",
    save_best_only=True, monitor="val_accuracy", mode="max", verbose=1
)
early_stop = EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True)
lr_reducer = ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-6, verbose=1)

# Training
history = model.fit(
    train_data,
    epochs=30,
    validation_data=val_data,
    callbacks=[early_stop, checkpoint, lr_reducer]
)

# Plotting
plt.figure(figsize=(12, 6))
plt.subplot(1, 2, 1)
plt.plot(history.history['accuracy'], label='Train Accuracy')
plt.plot(history.history['val_accuracy'], label='Validation Accuracy')
plt.title('Accuracy')
plt.xlabel('Epochs'); plt.ylabel('Accuracy'); plt.legend()

plt.subplot(1, 2, 2)
plt.plot(history.history['loss'], label='Train Loss')
plt.plot(history.history['val_loss'], label='Validation Loss')
plt.title('Loss')
plt.xlabel('Epochs'); plt.ylabel('Loss'); plt.legend()
plt.tight_layout()
plt.show()


# Define test path
test_path = "/content/PlantDiseaseProject/Test"

# Test data generator (no augmentation, just rescaling)
test_datagen = ImageDataGenerator(rescale=1./255)

# Load test data
test_data = test_datagen.flow_from_directory(
    test_path,
    target_size=(img_size, img_size),
    batch_size=batch_size,
    class_mode='categorical',
    shuffle=False
)

# Load the best saved model
model = tf.keras.models.load_model("/content/drive/MyDrive/PlantDiseaseProject/model_accurate_compact.keras")

# Evaluate on test set
test_loss, test_acc = model.evaluate(test_data)
print(f"\n Test Accuracy: {test_acc * 100:.2f}%")

# Load the .keras model
model = tf.keras.models.load_model("/content/drive/MyDrive/PlantDiseaseProject/model_accurate_compact.keras")

# Create TFLite converter from the loaded model
converter = tf.lite.TFLiteConverter.from_keras_model(model)

# Apply quantization
converter.optimizations = [tf.lite.Optimize.DEFAULT]

# Convert the model
tflite_model = converter.convert()

# Save the compressed .tflite model
with open("/content/drive/MyDrive/PlantDiseaseProject/quantized_model.tflite", "wb") as f:
    f.write(tflite_model)
