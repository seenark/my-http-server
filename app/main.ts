import * as net from "node:net";

console.clear();

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const rcvdData = data.toString();
    console.log("rcvd", rcvdData);
    const [firstline] = rcvdData.split("\r\n");
    const [method, path, httpVersion] = firstline.split(" ");
    if (path === "/") {
      console.log("path", path);
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
      return;
    }
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
  });
});

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!!");

// Uncomment this to pass the first stage
server.listen(4221, "localhost", () => {
  console.log("Server is running on port 4221");
});
