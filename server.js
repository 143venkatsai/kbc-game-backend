const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const QRCode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(cors()); 

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use(express.static('public'));

const questions = [
  {
    question: "What is the capital of India?",
    answer: "Delhi"
  },
  {
    question: "Who is the Deputy CM of AP?",
    answer: "Pavan Kalyan"
  },
  {
    question: "How many bones are there in Human body?",
    answer: "206"
  },
  {
    question: "Who is the President of India?",
    answer: "Droupadi Murmu"
  },
  {
    question: "what is the National Language of India?",
    answer: "Hindi"
  }
];

let currentQuestionIndex = 0;
let hostSocket = null;

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  io.on('host', async () => {
    console.log('Host connected:', socket.id);
    hostSocket = socket;
    sendQuestionToHost();
  });

  socket.on('join', async () => {
    console.log('Player joined:', socket.id);
    socket.emit('question', {
      question: questions[currentQuestionIndex].question,
      questionNumber: currentQuestionIndex + 1
    });
  });

  socket.on('answer', (data) => {
    const { name, answer } = data;
    const correctAnswer = questions[currentQuestionIndex].answer.toLowerCase().trim();

    if (answer.toLowerCase().trim() === correctAnswer) {
      if (hostSocket) {
        hostSocket.emit('correct', { name });
      }

      socket.emit('result', { success: true, message: "Congratulations!" });

      setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
          sendQuestionToHost();
          socket.emit('question', {
            question: questions[currentQuestionIndex].question,
            questionNumber: currentQuestionIndex + 1
          });
        } else {
          if (hostSocket) {
            hostSocket.emit('end', { message: "Game Over! Thank you for playing." });
          }
          io.emit('end', { message: "Game Over! Thank you for playing." });
        }
      }, 3000);
    } else {
      socket.emit('result', { success: false, message: "Wrong Answer. Provide Valid Answer to move next question!" });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket === hostSocket) {
      hostSocket = null;
    }
  });
});

async function sendQuestionToHost() {
  if (hostSocket && currentQuestionIndex < questions.length) {
    const question = questions[currentQuestionIndex].question;
    hostSocket.emit('question', {
      question: question,
      questionNumber: currentQuestionIndex + 1
    });

    const playerURL = `http://localhost:3000/player`; 
    const qrDataURL = await QRCode.toDataURL(playerURL);

    hostSocket.emit('qr', { qr: qrDataURL });
  } else if (hostSocket) {
    hostSocket.emit('end', { message: "Game Over! Thank you for playing." });
  }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
