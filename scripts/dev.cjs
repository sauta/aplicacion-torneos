const { spawn } = require("node:child_process");
const net = require("node:net");

const isWindows = process.platform === "win32";
const pnpmRunner = process.env.npm_execpath;
const children = [];

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function run(name, args) {
  const command = pnpmRunner ? process.execPath : (isWindows ? "corepack.cmd" : "corepack");
  const commandArgs = pnpmRunner ? [pnpmRunner, ...args] : ["pnpm", ...args];
  const child = spawn(command, commandArgs, {
    cwd: process.cwd(),
    env: process.env,
    shell: isWindows && !pnpmRunner,
    stdio: "pipe"
  });

  children.push(child);

  child.stdout.on("data", (data) => {
    process.stdout.write(`[${name}] ${data}`);
  });

  child.stderr.on("data", (data) => {
    process.stderr.write(`[${name}] ${data}`);
  });

  child.on("exit", (code) => {
    if (code !== 0 && !shuttingDown) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code || 1);
    }
  });
}

let shuttingDown = false;

function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
  if (await isPortOpen(3001)) {
    console.log("[api] http://127.0.0.1:3001 ya esta activo");
  } else {
    run("api", ["api"]);
  }

  if (await isPortOpen(5173)) {
    console.log("[vite] http://127.0.0.1:5173 ya esta activo");
  } else {
    run("vite", ["vite"]);
  }
}

main().catch((error) => {
  console.error(error);
  shutdown(1);
});
