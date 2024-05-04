import * as net from "node:net";

const server = net.createServer((socket) => {
  socket.on("data", () => {
    socket.write("HTTP/1.1 200 OK\r\n\r\n");
    socket.end();
  });
});

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
server.listen(4221, "localhost", () => {
  console.log("Server is running on port 4221");
});
