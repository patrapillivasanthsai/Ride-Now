import http from 'http';
import app from './app';
import { initSocketServer } from './socket';

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Initialize real-time Socket.IO communication engine
initSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
