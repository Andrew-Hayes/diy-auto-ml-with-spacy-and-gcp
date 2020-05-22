#!/usr/bin/env python
# coding: utf8
"""Train a convolutional neural network text classifier on a
 dataset, using the TextCategorizer component. The dataset will be loaded
automatically via Thinc's built-in dataset loader. The model is added to
spacy.pipeline, and predictions are available via `doc.cats`. For more details,
see the documentation:
* Training: https://spacy.io/usage/training

Compatible with: spaCy v2.0.0+
"""
from __future__ import unicode_literals, print_function
import plac
import random
from pathlib import Path
import csv
from collections import defaultdict

import spacy
from spacy.util import minibatch, compounding

output_dir_name = "./model"

@plac.annotations(
    input_file=("File path to dataset", 'positional', None, str),
    n_iter=("Number of training iterations", "option", "n", int),
    n_split=("Split for train vs test. Default 80% train", "option", "s", float),
)
def main(input_file, n_iter=20, n_split=0.8):
    output_dir = Path(output_dir_name)
    if not output_dir.exists():
        output_dir.mkdir()

    nlp = spacy.load("en_core_web_md")  # load existing spaCy model

    # add the text classifier to the pipeline if it doesn't exist
    # nlp.create_pipe works for built-ins that are registered with spaCy
    if "textcat" not in nlp.pipe_names:
        textcat = nlp.create_pipe(
            "textcat", config={"exclusive_classes": True}
        )
        nlp.add_pipe(textcat, last=True)
    # otherwise, get it, so we can add labels to it
    else:
        textcat = nlp.get_pipe("textcat")

    print("Loading data...")
    (train_texts, train_cats), (dev_texts, dev_cats), largestLabel, labels = load_data(input_file, splitRatio=n_split)

    # add labels to text classifier
    for label in labels:
        textcat.add_label(label.upper())

    print(
        "{} training, {} evaluation".format(
            len(train_texts), len(dev_texts)
        )
    )
    train_data = list(zip(train_texts, [{"cats": cats} for cats in train_cats]))

    # get names of other pipes to disable them during training
    pipe_exceptions = ["textcat", "trf_wordpiecer", "trf_tok2vec"]
    other_pipes = [pipe for pipe in nlp.pipe_names if pipe not in pipe_exceptions]
    with nlp.disable_pipes(*other_pipes):  # only train textcat
        optimizer = nlp.begin_training()
        print("Training the model...")
        print("{:^5}\t{:^5}\t{:^5}\t{:^5}".format("LOSS", "P", "R", "F"))
        batch_sizes = compounding(4.0, 32.0, 1.001)
        for _ in range(n_iter):
            losses = {}
            # batch up the examples using spaCy's minibatch
            random.shuffle(train_data)
            batches = minibatch(train_data, size=batch_sizes)
            for batch in batches:
                texts, annotations = zip(*batch)
                nlp.update(texts, annotations, sgd=optimizer, drop=0.2, losses=losses)
            with textcat.model.use_params(optimizer.averages):
                # evaluate on the dev data split off in load_data()
                scores = evaluate(nlp.tokenizer, textcat, dev_texts, dev_cats, largestLabel.upper())
            print(
                "{0:.3f}\t{1:.3f}\t{2:.3f}\t{3:.3f}".format(  # print a simple table
                    losses["textcat"],
                    scores["textcat_p"],
                    scores["textcat_r"],
                    scores["textcat_f"],
                )
            )

    with nlp.use_params(optimizer.averages):
        nlp.to_disk(output_dir)
    print("Saved model to", output_dir)


def load_data(input_file, splitRatio=0.8):
    """Load data from the dataset."""
    # Partition off part of the train data for evaluation
    train_data = defaultdict(list)
    entries = 0
    with open(input_file) as csv_file:
        csv_reader = csv.reader(csv_file, delimiter=',')
        for row in csv_reader:
            entries += 1
            train_data[row[1].strip()].append((row[0], row[1].strip()))


    train_texts = []
    train_cats = []
    test_texts = []
    test_cats = []
    largestLabel = ""
    largestLabelCount = -1
    print(f'Loaded {entries} entries.')
    for data_type in train_data:
        labeled_data = train_data[data_type]
        if len(labeled_data) > largestLabelCount:
            largestLabel = data_type
            largestLabelCount = len(labeled_data)
        random.shuffle(labeled_data)
        texts, labels = zip(*labeled_data)
        cats = []
        for label in labels:
            cat = {}
            for main_label in train_data:
                cat[main_label.upper()] = bool(label.strip() == main_label)
            cats.append(cat)
        if len(texts) < 6:
            test_texts.extend(texts[:1])
            test_cats.extend(cats[:1])
            train_texts.extend(texts[1:])
            train_cats.extend(cats[1:])
        else:
            split = int(len(texts) * splitRatio)
            train_texts.extend(texts[:split])
            train_cats.extend(cats[:split])
            test_texts.extend(texts[split:])
            test_cats.extend(cats[split:])

    zippedTrain = list(zip(train_texts, train_cats))
    random.shuffle(zippedTrain)
    zippedTest = list(zip(test_texts, test_cats))
    random.shuffle(zippedTest)
    
    return zip(*zippedTrain), zip(*zippedTest), largestLabel, train_data.keys()


def evaluate(tokenizer, textcat, texts, cats, first_label):
    docs = (tokenizer(text) for text in texts)
    tp = 0.0  # True positives
    fp = 1e-8  # False positives
    fn = 1e-8  # False negatives
    tn = 0.0  # True negatives
    for i, doc in enumerate(textcat.pipe(docs)):
        gold = cats[i]
        for label, score in doc.cats.items():
            if label not in gold:
                continue
            if label != first_label:
                continue
            if score >= 0.5 and gold[label] >= 0.5:
                tp += 1.0
            elif score >= 0.5 and gold[label] < 0.5:
                fp += 1.0
            elif score < 0.5 and gold[label] < 0.5:
                tn += 1
            elif score < 0.5 and gold[label] >= 0.5:
                fn += 1
    precision = tp / (tp + fp)
    recall = tp / (tp + fn)
    if (precision + recall) == 0:
        f_score = 0.0
    else:
        f_score = 2 * (precision * recall) / (precision + recall)
    return {"textcat_p": precision, "textcat_r": recall, "textcat_f": f_score}


if __name__ == "__main__":
    plac.call(main)