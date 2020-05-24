import os

import spacy
from flask import Flask
from flask import request
import json

app = Flask(__name__)

nlp = None

def load_model():
    global nlp
    model_dir = "./model"
    print("loading from {}".format(model_dir))
    nlp = spacy.load(model_dir)

@app.route('/stats', methods=['GET'])
def getStats():
    print("getStats")
    with open('./stats.json') as json_file:
        data = json.load(json_file)
        return '{}'.format(json.dumps(data))
    return '\{\}\n'

@app.route('/', methods=['POST'])
def classify():
    global nlp
    print("classify")
    req_data = request.get_json(force=True, silent=True)
    if req_data is None:
        return 'bad request', 400

    if nlp is None:
        load_model()
    payload = str(req_data['payload'])
    doc = nlp(payload)
    return '{}\n'.format(doc.cats)

if __name__ == "__main__":
    app.run(debug=True,host='0.0.0.0',port=int(os.environ.get('PORT', 8080)))