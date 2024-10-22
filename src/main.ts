import PlayerServers from "./playerservers/index";
import { consola } from "consola";
import inquirer from 'inquirer';
import fs from "fs";

import unzipper from "unzipper";
import dotenv from 'dotenv';
import path from "path";
import normalQuestion from "./normalQuestion";
import hiddenQuestion from "./hiddenQuestion";

dotenv.config();

const playerservers = new PlayerServers();

const appDataPath =
  process.env.APPDATA ||
  (process.platform === "darwin"
    ? "~/Library/Preferences"
    : "~/cc-extract-app");

const appDataDir = appDataPath + "/cc-extract-app";
const cacheDataDir = appDataPath + "/cc-extract-app/cache";

exports.cacheDataDir = cacheDataDir;
exports.appDataDir = appDataDir;

if (!fs.existsSync(appDataDir) || !fs.existsSync(`${appDataDir}/data.json`)) {
  runSetup();
} else {
  run();
}

async function runSetup() {
  consola.info("[SETUP] Running setup");
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir);
  }
  if (!fs.existsSync(cacheDataDir)) {
    fs.mkdirSync(cacheDataDir);
  }

  let username = await normalQuestion("Username: ");
  let password = await hiddenQuestion("Password: ");

  if(!username || !password) {
    consola.error("[SETUP] Username or password is empty");
    runSetup();
  }

  fs.writeFileSync(`${appDataDir}/data.json`, JSON.stringify({ username, password }));

  run();
}

async function run() {
  consola.info("[RUN] Running app");
  const data = JSON.parse(fs.readFileSync(`${appDataDir}/data.json`).toString());

  await playerservers.login({
    username: data.username,
    password: data.password
  }).then(async () => {
    consola.success("[RUN] Logged in");
    let servers = await playerservers.getServers();

    let serverNames = servers.map((server) => server.name);

    let server = await inquirer.prompt({
      type: "list",
      name: "server",
      message: "Select a server",
      choices: serverNames
    });

    let selServer = await playerservers.selectServer(server.server);

    await playerservers.executeCommand("say Connected via cc-extract-app, extracting!")

    const folderCache = [] as string[];
    function extract(path: string) {
      return new Promise((resolve, reject) => {
        playerservers.getFiles(path).then((files) => {
          const folderPromises = files.folders.map((folder) => {
            if (folder.deletefolderlink.startsWith("//plugins") || folder.deletefolderlink.startsWith("//libraries") || folder.deletefolderlink.includes("?")) {
              return Promise.resolve();
            }
            if (folderCache.includes(folder.deletefolderlink)) {
              return Promise.resolve();
            }
            folderCache.push(folder.deletefolderlink);
          });
    
          Promise.all(folderPromises).then(() => {
            resolve(folderCache);
          });
        });
      });
    }

    let folderCount = 0;

    extract("/plugins").then(async (files: unknown) => {
      extract("/").then(async (files: unknown) => {
        folderCount = folderCache.length;
      });
    });
    
    extract("/").then(async (files: unknown) => {
      consola.success("[RUN] Extracted files");

      await playerservers.executeCommand(`say Extracted all files, downloading! [${folderCache.length} files]`)
      let downloaded = 0;
      setInterval(() => {
        if(downloaded === folderCache.length) {
          consola.success("[RUN] Downloaded all files");
          process.exit(0);
        }
        process.stdout.write(`Progress: ${downloaded}/${folderCache.length} [${"#".repeat(downloaded)}${" ".repeat(folderCache.length - downloaded)}] ${Math.floor((downloaded / folderCache.length) * 100)}%\r`);
      }, 100);
      if(!fs.existsSync(cacheDataDir)) {
        fs.mkdirSync(cacheDataDir);
      }

      if (typeof files !== "object") {
        return;
      }
      if (files === null) {
        return;
      }
      Promise.all(
        (files as any[]).map(async (file) => {
          if(!fs.existsSync(path.join(cacheDataDir, server.server + "-temp"))) {
            fs.mkdirSync(path.join(cacheDataDir, server.server + "-temp"));
          }
          const buffer = await playerservers.downloadFolder(path.join(cacheDataDir, file), file);
          if (buffer) {
            downloaded++;
            fs.writeFileSync(
              path.join(
                cacheDataDir,
                server.server + "-temp",
                "temp-" +
                  `${file}`
                    .replace(/\//, "")
                    .replace(/\//, "")
                    .replace(/\\/, "")
                    .replace(/\\/, "")
                    .replace(/\//g, "-") +
                  ".zip"
              ),
              buffer
            );
            const extractStream = fs.createReadStream(
              path.join(
                cacheDataDir,
                server.server + "-temp",
                "temp-" +
                  `${file}`
                    .replace(/\//, "")
                    .replace(/\//, "")
                    .replace(/\\/, "")
                    .replace(/\\/, "")
                    .replace(/\//g, "-") +
                  ".zip"
              )
            ).pipe(unzipper.Extract({ path: path.join(cacheDataDir, server.server + file) }));
            
            extractStream.on('error', (err) => {
              const fileSize = fs.statSync(path.join(cacheDataDir, server.server + "-temp", "temp-" + `${file}`.replace(/\//, "").replace(/\//, "").replace(/\\/, "").replace(/\\/, "").replace(/\//g, "-") + ".zip")).size;
              console.error(`Failed to extract ${file} - file is corrupted or not a zip file. (or empty) [${fileSize} bytes]`);
            });
          }
        })
      ).then(() => {
        setTimeout(() => {
          try {
            fs.rmSync(path.join(cacheDataDir, server.server + "-temp"), { recursive: true });
          } catch (error) {
            console.error(`Failed to delete temp folder: ${error}`);
          }
        }, 1000);
      });
    });
    

  }).catch((err) => {
    consola.error("[RUN] Error logging in", err);
  })
  
}