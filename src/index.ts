
import PlayerServers from "./playerservers/index";
import { consola } from "consola";

import dotenv from 'dotenv';

dotenv.config();

const playerservers = new PlayerServers();

let { CUBED_USER, CUBED_PASS } = process.env;

if(!CUBED_USER || !CUBED_PASS) throw new Error('Missing CUBED_USER or CUBED_PASS in .env');

const motds = [
  "&c&lTOP SECRET SERVER",
  "&a&lJOIN FOR FREE OP!",
  "&a&lLEAKED STAFF DOCS",
  "&b&lNEW BEDBOX JOIN NOW!!",
  "&a&lzNotChill was here!",
  "&a&l_EliteFestell was here!",
  "&a&lMyNameIs12345 was here!",
  "&a&lgabitza1234 was here!",
  "&a&lJeroeno_Boy was here!",
  "&a&lIDuckz_ was here!",
  "&a&lRIP SHITBOX :PENSIVE:",
  "&a&lMANGO IS THE BEST SERVER!",
  "&a&lBetter than Notchbox!",
  "&b&lfree vbucks",
  "&b&lfree robux",
  "&b&lfree minecraft account",
  "&b&lCUSTOM SKRIPTED FEATURES!",
  "&b&lCUSTOM PLUGINS!",
  "&a&lSERVER RELEASED!",
  "&8[&c&lNEW&8] &c&lPlugin added",
  "&8[&c&lNEW&8] &c&lPlugin remove",
  "&8[&c&lNEW&8] &c&lPlugin update",
  "&8[&c&lNEW&8] &c&lPlugin fixed",
  "&6LEAKED STAFF IP",
  "&aILLEGAL MODIFICATIONS ALLOWED",
]

playerservers.login({
  username: CUBED_USER,
  password: CUBED_PASS,
}).then(async (res) => {
  console.log('Logged in as ' + res.username);

  const select = await playerservers.selectServer("Mango");

  playerservers.executeCommand("say bing bong from api plks work :)")

  setInterval(async () => {
    await playerservers.setMOTD(motds[Math.floor(Math.random() * motds.length)]);
  }, 10000);
  
}).catch((err) => {
  console.error(err);
});