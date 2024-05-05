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
  const rawSplited = text.split("\r\n");
  const separationIndex = rawSplited.findIndex((data) => data === "");
  const headerSection = rawSplited.slice(1, separationIndex);
  const body = rawSplited.slice(separationIndex + 1);
  console.log({ headerSection, body });
  const headerObj = headerSection
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
    ...headerObj,
    ...extractMethodAndPath(text),
    body: body.join("\r\n"),
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
    console.log("rcvdData", rcvdData);
    const req = parseHeader(rcvdData);
    console.log("req", req);
    const { path, httpVersion, method } = req;
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

    if (path === "/user-agent") {
      const content = createResponseBody({
        httpVersion,
        statusCode: 200,
        statusText: "OK",
        "Content-Type": "text/plain",
        body: req["User-Agent"],
      });
      console.log("content", content);
      socket.write(`${content}\r\n\r\n`);
      socket.end();
      return;
    }

    if (method === "GET" && path.includes("/files/")) {
      const fileName = path.replace("/files/", "");
      const folderName = getFolderNameFromCliDirectory();
      const fileFullPath = join(folderName, fileName);
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
      socket.end();
      return;
    }
    if (method === "POST" && path.includes("/files/")) {
      const fileName = path.replace("/files/", "");
      const folderName = getFolderNameFromCliDirectory();
      const fileFullPath = join(folderName, fileName);
      try {
        await fs.writeFile(fileFullPath, req.body, { encoding: "utf-8" });
        socket.write("HTTP/1.1 201 Created \r\n\r\n");
      } catch (error) {
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
      }
      socket.end();
      return;
    }

    if (path.includes("/files/")) {
      socket.write("HTTP/1.1 405 Method Not Allowed\r\n\r\n");
    }

    console.log("req", req);

    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.end();
    return;
  });
});

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!!");

// Uncomment this to pass the first stage
server.listen(4221, "localhost", () => {
  console.log("Server is running on port 4221");
});
