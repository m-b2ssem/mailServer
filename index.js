import express from 'express';  // import express from 'express';
import path from 'path';  // import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bodyParser from 'body-parser';
import { config } from 'dotenv';
import { createServer } from 'http';
import nodemailer from 'nodemailer';
import session from 'express-session';
import cors from 'cors';


config();
const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);
export const app = express();

app.use(cors({
  origin: '*',
}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    maxAge: 60000 * 60 * 24 * 30  // 1 manoth
   }
}));



app.use(bodyParser.urlencoded({limit: '10mb',extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json({ limit: '10mb' }));

const password = process.env.EMAIL_PASSWORD;
const user = process.env.EMAIL_USER;
const host = process.env.EMAIL_HOST;
const port = process.env.EMAIL_PORT;


const mailTransport = nodemailer.createTransport({
  host: host,
  secure: true,
  tls: {
    rejectUnauthorized: false,
  },
  port: port,
  auth: {
      user: user,
      pass: password
  },
});

const validateEmail = (email) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

app.post('/send-email', async (req, res) => {
  const { email, subject, template, from } = req.body;
  const sessionToken = process.env.API_TOKEN;
  const token = req.headers['mail_server_token'];

  console.log(token, sessionToken);
  if (token !== sessionToken) {
	return res.status(403).send('Forbidden: Invalid token');
  }

  if (!email || !subject || !template) {
	return res.status(400).send('Bad Request: Missing required fields');
  }

  if (!email.trim() || !subject.trim() || !template.trim()) {
	return res.status(400).send('Bad Request: Fields cannot be empty');
  }

  if (!validateEmail(email)) {
	return res.status(400).send('Bad Request: Invalid email format');
  }

  try {
	await mailTransport.sendMail({
	  from: `${from} <${user}>`,
	  to: email,
	  subject,
	  text: template
	});
	res.status(200).send('Email sent successfully');
  } catch (error) {
	console.error('Error sending email:', error);
	res.status(500).send('Error sending email');
  }
});

const PORT = process.env.PORT;

const server = createServer(app);

server.listen(PORT, () => {
  console.log('Server is running on http://localhost: ' + PORT);
});