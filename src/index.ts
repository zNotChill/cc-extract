
import PlayerServers from "./playerservers/index";

import dotenv from 'dotenv';

dotenv.config();

const playerservers = new PlayerServers();

let { CUBED_USER, CUBED_PASS } = process.env;

if(!CUBED_USER || !CUBED_PASS) throw new Error('Missing CUBED_USER or CUBED_PASS in .env');

playerservers.login(CUBED_USER, CUBED_PASS).then(() => {
  console.log('Logged in!');

  const servers = playerservers.getServers();
  

}).catch((err) => {
  console.error(err);
});