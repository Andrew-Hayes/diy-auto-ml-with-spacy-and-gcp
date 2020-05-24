# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.7-slim as builder

# Copy local code to the container image.
ENV APP_HOME /app
WORKDIR $APP_HOME

RUN pip install spacy
RUN python -m spacy download en_core_web_md

COPY . ./

ARG dataset_url
ADD ${dataset_url} ./test.csv
RUN python create_model.py ./test.csv

FROM python:3.7-slim

# Copy local code to the container image.
ENV APP_HOME /app
WORKDIR $APP_HOME

# Install production dependencies.
RUN pip install Flask gunicorn spacy

COPY --from=builder /app/model/ ./model/
COPY --from=builder /app/stats.json ./
COPY ./app.py ./

# Run the web service on container startup. Here we use the gunicorn
# webserver, with one worker process and 8 threads.
# For environments with multiple CPU cores, increase the number of workers
# to be equal to the cores available.
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app