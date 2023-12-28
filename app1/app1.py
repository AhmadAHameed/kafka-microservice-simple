import configparser
import logging
import threading
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from kafka import KafkaConsumer, KafkaProducer
import uvicorn
from pathlib import Path
import requests

HOST = "localhost"
PORT = 8005

app = FastAPI()
BASE_DIR = Path(__file__).resolve().parent
TEMPLATES = Jinja2Templates(directory=Path(BASE_DIR, "templates"))
APP1_COUNTER = 0
APP2_COUNTER = 0

KAFKA_CONFIG = configparser.ConfigParser()
KAFKA_CONFIG.read(str(BASE_DIR.parent / "kafka-config.ini"))

BOOTSTRAP_SERVERS = KAFKA_CONFIG.get("kafka_global_host", "bootstrap_servers")
BOOTSTRAP_SERVERS = [BOOTSTRAP_SERVERS]

PRODUCE_TOPIC = KAFKA_CONFIG.get("kafka_topics", "app1_topic")
CONSUME_TOPIC = KAFKA_CONFIG.get("kafka_topics", "app2_topic")

KAFKA_PRODUCER = KafkaProducer(bootstrap_servers=BOOTSTRAP_SERVERS)
KAFKA_CONSUMER = KafkaConsumer(
    CONSUME_TOPIC,
    bootstrap_servers=BOOTSTRAP_SERVERS,
    group_id="app2-group",
    auto_offset_reset="earliest",
    enable_auto_commit=True,
)


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return TEMPLATES.TemplateResponse(
        "index.html",
        {
            "request": request,
            "app1_counter_value": APP1_COUNTER,
            "app2_counter_value": APP2_COUNTER,
        },
    )


@app.post("/increment-app1-counter/")
async def increment_app1_counter():
    global APP1_COUNTER
    APP1_COUNTER += 1
    try:
        KAFKA_PRODUCER.send(
            PRODUCE_TOPIC, f"app1_counter: {APP1_COUNTER}".encode("utf-8")
        )
        KAFKA_PRODUCER.flush()
    except Exception as e:
        logging.error(e)
    return {"status": "success", "app1_counter_value": APP1_COUNTER}


def consume_messages(consumer, topic):
    for message in consumer:
        message_text = message.value.decode("utf-8")
        print(f"Received Message: {message_text}, from Topic: {topic}")
        global APP2_COUNTER
        APP2_COUNTER = extract_app2_counter(message_text)
        try:
            requests.get(f"http://{HOST}:{PORT}/")
        except Exception as e:
            logging.error(e)


def extract_app2_counter(message: str):
    return int(message.split(": ")[-1])


CONSUMER_THREAD = threading.Thread(
    target=consume_messages, args=(KAFKA_CONSUMER, CONSUME_TOPIC)
)
CONSUMER_THREAD.start()

if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
