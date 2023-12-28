const express = require('express');
const ini = require('ini')
const fs = require('fs')
const path = require('path')
const ejs = require("ejs")
const bodyParser = require('body-parser')
const kafka = require('kafka-node')

const app = express()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'templates'))

let APP1_COUNTER = 0
let APP2_COUNTER = 0

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const KAFKA_CONFIG = ini.parse(fs.readFileSync('../kafka-config.ini', 'utf-8'))
const KAFKA_HOST = KAFKA_CONFIG.kafka_global_host.bootstrap_servers

const CONSUMER_TOPIC = KAFKA_CONFIG.kafka_topics.app1_topic
const PRODUCER_TOPIC = KAFKA_CONFIG.kafka_topics.app2_topic
const CONSUMER_TOPICS = [{ topic: CONSUMER_TOPIC, partition: 0 }]

const KAFKA_CLIENT = new kafka.KafkaClient({ kafkaHost: KAFKA_HOST })
const KAFKA_OPTIONS = {
    autoCommit: true,
    fetchMaxWaitMs: 1000,
    fetchMaxBytes: 1024 * 1024,
    encoding: 'utf8',
    fromOffset: false,
};

const KAFKA_CONSUMER = new kafka.Consumer(KAFKA_CLIENT, CONSUMER_TOPICS, KAFKA_OPTIONS)
const KAFKA_PRODUCER = new kafka.Producer(KAFKA_CLIENT)

const PORT = 8006

app.get('/', async (req, res) => {
    const latestMessage = await fetchLatestKafkaMessage()
    const data = {
        app1_counter_value: latestMessage,
        app2_counter_value: APP2_COUNTER
    }
    res.render('index', data)
})

async function fetchLatestKafkaMessage() {
    return new Promise((resolve, reject) => {

        const latestMessage = APP1_COUNTER;

        if (latestMessage !== undefined) {
            resolve(latestMessage);
        } else {
            reject('Latest Kafka message not available');
        }
    });
}

app.post('/increment-app2-counter/', async (req, res) => {
    if (!APP2_COUNTER) {
        APP2_COUNTER = 1
    } else {
        APP2_COUNTER++
    }
    console.log(`App2 Counter: ${APP2_COUNTER}`)
    try {

        const producerPayloads = [{ topic: PRODUCER_TOPIC, messages: `App2 Counter: ${APP2_COUNTER}` }]
        KAFKA_PRODUCER.send(producerPayloads, function (err, data) {
            if (err) {
                console.error('Error producing message:', err);
            } else {
                console.log('Message produced successfully:', data);
            }
        })
        res.json({ app2_counter_value: APP2_COUNTER })
    } catch (error) {
        console.log(error)
        res.status(500).send('Internal Server Error');
    }
})


KAFKA_CONSUMER.on('message', function (message) {
    const messageValue = message.value;
    console.log(`Received message: ${messageValue}`);
    APP1_COUNTER = messageValue.split(': ').pop();

    fetchLatestKafkaMessage().then((latestMessage) => {
        console.log(`Latest Kafka message value: ${latestMessage}`);

    })
})

KAFKA_CONSUMER.on('error', function (err) {
    console.error('Error from consumer:', err);
});

// Handle errors for producer
KAFKA_PRODUCER.on('error', function (err) {
    console.error('Error from producer:', err);
});

// Handle shutdown gracefully
process.on('SIGINT', function () {
    console.log('Disconnecting Kafka consumer and producer...');
    KAFKA_CONSUMER.close(true, function () {
        KAFKA_PRODUCER.close(function () {
            process.exit();
        });
    });
});


app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(__dirname)
})

