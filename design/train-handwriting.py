"""Build the small browser-only digit model used by the independent handwriting lab.

Input: the official mnist.npz archive. No data is downloaded by this script.
The training data is not included in the Site. See handwriting/credits.txt.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
from sklearn.neural_network import MLPClassifier
from threadpoolctl import threadpool_limits


def normalize(image):
    image = np.asarray(image, dtype=np.float32)
    yy, xx = np.nonzero(image > 12)
    if not len(xx):
        return np.zeros(784, dtype=np.float32)
    crop = image[yy.min():yy.max()+1, xx.min():xx.max()+1]
    height, width = crop.shape
    scale = 20 / max(width, height)
    resized = np.asarray(Image.fromarray(crop.astype('uint8')).resize(
        (max(1, round(width*scale)), max(1, round(height*scale))), Image.Resampling.BILINEAR), dtype=np.float32)/255
    out = np.zeros((28, 28), dtype=np.float32)
    height, width = resized.shape
    total = resized.sum()
    cy = (resized*np.arange(height)[:, None]).sum()/total
    cx = (resized*np.arange(width)[None, :]).sum()/total
    x, y = round(13.5-cx), round(13.5-cy)
    x, y = min(28-width, max(0, x)), min(28-height, max(0, y))
    out[y:y+height, x:x+width] = resized
    return out.ravel()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    data = np.load(args.archive)
    print('Normalizing 60,000 training and 10,000 held-out digits.', flush=True)
    train = np.asarray([normalize(image) for image in data['x_train']], dtype=np.float32)
    test = np.asarray([normalize(image) for image in data['x_test']], dtype=np.float32)
    model = MLPClassifier(hidden_layer_sizes=(96,), activation='relu', batch_size=256,
                          learning_rate_init=.0015, max_iter=22, early_stopping=True,
                          validation_fraction=.08, n_iter_no_change=4,
                          random_state=811, verbose=True)
    with threadpool_limits(limits=2):
        model.fit(train, data['y_train'])
        accuracy = model.score(test, data['y_test'])
    args.output.mkdir(parents=True, exist_ok=True)
    arrays = [model.coefs_[0], model.intercepts_[0], model.coefs_[1], model.intercepts_[1]]
    blob = np.concatenate([array.ravel() for array in arrays]).astype('<f4')
    (args.output/'digits.f32').write_bytes(blob.tobytes())
    metadata = dict(format=1, input=784, hidden=96, output=10, side=28,
                    arrays=[list(array.shape) for array in arrays], byteLength=blob.nbytes,
                    normalization='bbox-20-center-of-mass-28',
                    heldOutMNISTAccuracy=round(float(accuracy), 5),
                    trainingSamples=len(train), testSamples=len(test), seed=811,
                    license='CC-BY-SA-3.0', weights='digits.f32')
    (args.output/'model.json').write_text(json.dumps(metadata, indent=2)+'\n')
    # A held-out fixture verifies the JavaScript inference implementation too.
    selected=[]
    for digit in range(10):
        indices=np.flatnonzero(data['y_test']==digit)[:3]
        for i in indices:
            selected.append(dict(label=digit, pixels=np.round(test[i]*255).astype('uint8').tolist(),
                                 prediction=int(model.predict(test[i:i+1])[0])))
    (args.output.parent.parent/'design/handwriting-model-fixtures.json').write_text(json.dumps(selected,separators=(',',':'))+'\n')
    print(json.dumps(dict(held_out_accuracy=accuracy, bytes=blob.nbytes, iterations=model.n_iter_)),flush=True)


if __name__ == '__main__':
    main()
