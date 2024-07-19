const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const http = require('http');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());

const port=3000;

let clients = {};

const createClient = (clientId) => {
    if (clients[clientId]) return;  // Prevent re-initialization of the same client

    const client = new Client({
        authStrategy: new LocalAuth({ clientId }),
        puppeteer: {
            headless: true
        }
    });

    client.on('ready', () => {
        console.log(`Client ${clientId} is ready!`);
    });

    client.on('qr', async qr => {
        console.log(`QR Code for Client ${clientId}: ${qr}`);
        clients[clientId].qr = await qrcode.toDataURL(qr);
        console.log(`QR Code stored for Client ${clientId}`);
    });

    client.on('message_create', message => {
        if (!message.fromMe) {
            const timestamp = message.timestamp * 1000;
            const date = new Date(timestamp);
            console.log("Author:", message.author);
            console.log("To:", message.to);
            console.log("From:", message.from);
            console.log("Message:", message.body);
            console.log("Date:", date.toLocaleDateString());
            console.log("Time:", date.toLocaleTimeString());

            var options = {
                host: "linkingsoft.com",
                port: 80,
                path: '/inam/index.php?number=' + message.to,
                method: 'POST'
            };

            http.request(options, function (res) {
                console.log('STATUS: ' + res.statusCode);
                console.log('HEADERS: ' + JSON.stringify(res.headers));
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.log('BODY: ' + chunk);
                });
            }).end();
        }
    });

    client.on('error', error => {
        console.error(`Client ${clientId} error:`, error);
    });

    clients[clientId] = { client, qr: null };

    client.initialize().then(() => {
        console.log(`Client ${clientId} initialized successfully!`);
    }).catch(error => {
        console.error(`Initialization error for Client ${clientId}:`, error);
    });
};

app.post('/create-client', (req, res) => {
    const { clientId } = req.body;
    if (!clientId) {
        return res.status(400).json({ error: 'Client ID is required' });
    }
    if (!clients[clientId]) {
        createClient(clientId);
    }
    res.json({ message: 'Client created', clientId });
});

app.get('/qr/:clientId', async (req, res) => {
    const { clientId } = req.params;
    const client = clients[clientId];
    if (client && client.qr) {
        res.json({ qr: client.qr });
    } else {
        res.status(404).json({ error: 'Client not found or QR not generated yet' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
