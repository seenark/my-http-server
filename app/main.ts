import * as net from "node:net";
import * as fs from "node:fs/promises";
import { join } from "node:path";

console.clear();

const extractMethodAndPath = (text: string) => {
  const [firstline] = text.split("\r\n");
  const [method, path, httpVersion] = firstline.split(" ");
  return {
    method,
    path,
    httpVersion,
  } as const;
};

const parseHeader = (text: string) => {
  const [_firstline, ...rest] = text.split("\r\n");
  const restObj = rest
    .filter((pair) => !!pair[0])
    .reduce(
      (acc, cur) => {
        const [key, value] = cur.split(":");
        acc[key.trim()] = value.trim();
        return acc;
      },
      {} as Record<"User-Agent" | "Accept" | "Host" | (string & {}), string>,
    );

  return {
    ...restObj,
    ...extractMethodAndPath(text),
  };
};

const createResponseBody = (args: {
  httpVersion: string;
  statusText: string;
  statusCode: number;
  "Content-Type": "text/plain" | "application/octet-stream";
  body: string;
}) => {
  const { body, httpVersion, statusText, statusCode } = args;
  return `${httpVersion} ${statusCode} ${statusText}\r\nContent-Type: ${args["Content-Type"]}\r\nContent-Length: ${body.length}\r\n\r\n${body}`;
};

const getFolderNameFromCliDirectory = (): string => {
  const dirIndex = process.argv.findIndex((arg) => arg === "--directory");
  if (dirIndex === undefined) return "";
  return process.argv[dirIndex + 1];
};

const server = net.createServer((socket) => {
  socket.on("data", async (data) => {
    const rcvdData = data.toString();
    const headers = parseHeader(rcvdData);
    console.log("headers", headers);
    const { path, httpVersion } = headers;
    if (path === "/") {
      console.log("path", path);
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
      return;
    }
    if (path.includes("/echo/")) {
      const pathWithoutEcho = path.replace("/echo/", "");
      console.log("pathWithoutEcho", pathWithoutEcho);
      const responseArr = [
        "HTTP/1.1 200 OK",
        "Content-Type: text/plain",
        `Content-Length: ${pathWithoutEcho.length}`,
        `\n${pathWithoutEcho}`,
      ];
      const responseStr = responseArr.join("\r\n");
      console.log("responseStr", responseStr);
      socket.write(`${responseStr}\r\n\r\n`);
      return;
    }
    if (path.includes("/files/")) {
      const fileName = path.replace("/files/", "");
      console.log("file name", fileName);
      const args = process.argv;
      console.log("args", args);
      const folderName = getFolderNameFromCliDirectory();
      const fileFullPath = join(folderName, fileName);
      console.log("file full path", fileFullPath);
      try {
        const fileContent = await fs.readFile(fileFullPath, "utf-8");

        const content = createResponseBody({
          httpVersion,
          statusCode: 200,
          statusText: "OK",
          "Content-Type": "application/octet-stream",
          body: fileContent,
        });
        socket.write(`${content}\r\n\r\n`);
      } catch (error) {
        const content = createResponseBody({
          httpVersion,
          statusCode: 404,
          statusText: "Not Found",
          "Content-Type": "application/octet-stream",
          body: "",
        });
        socket.write(`${content}\r\n\r\n`);
      }
      return;
    }
    if (path === "/user-agent") {
      const content = createResponseBody({
        httpVersion,
        statusCode: 200,
        statusText: "OK",
        "Content-Type": "text/plain",
        body: headers["User-Agent"],
      });
      console.log("content", content);
      socket.write(`${content}\r\n\r\n`);
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
