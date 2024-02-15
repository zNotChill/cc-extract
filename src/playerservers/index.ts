
import dotenv from 'dotenv';
import cheerio from 'cheerio';
import fetch, { Body, HeaderInit, RequestInit } from 'node-fetch';
import FormData from 'form-data';
import colors from 'colors/safe';
import { parseCookie, parseProtocol, parseUUID, stringifyCookie } from './lib/parse';
import { File } from 'buffer';

dotenv.config();

class EventEmitter {
  private events: Record<string, Function[]> = {};

  on(event: Events, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event: string, ...args: any[]) {
    const listeners = this.events[event];
    if (listeners) {
      for (const listener of listeners) {
        listener(...args);
      }
    }
  }

  off(event: string, listener: Function) {
    const listeners = this.events[event];
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }
}

class PlayerServers {

  private cookie: string | null;
  private token: string | null | undefined;
  public user: User;
  private verbose: boolean;
  public event: EventEmitter;

  constructor() {
    this.cookie = null;
    this.token = null;
    this.user = {} as User;
    this.verbose = false;
    this.event = new EventEmitter();

  }

  /**
   * 
   * @param url The URL to request
   * @param method The request method
   * @param headers The request headers
   * @param body The request body
   * @returns 
   */
  public async request(url: string, method: RequestMethod, headers: Record<string, string>, body?: any) {
    let options: RequestInit = {
      method: method,
      body: body,
      headers: {
        ...headers,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.2; Win64; x64) Gecko/20130401 Firefox/46.7", // random user agent
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
      },
    }
    if (this.cookie && options.headers) {
      options.headers['Cookie'] = stringifyCookie({
        PHPSESSID: this.cookie
      });
    }
    
    return await fetch(url, options);
  }

  private async verboseLog(text: string) {
    if (this.verbose === true) {
      console.log(`${colors.magenta("[Verbose]")} ${colors.magenta(text)}`);
    }
  }

  /**
   * @param username The username to log in with
   * @param password The password to log in with
   * @param verbose Whether to log verbose messages
   * @returns Returns user data if successful, throws an error if not
   */
  async login({
    username,
    password,
    verbose = false,
  }) {
    this.verbose = verbose;
    if(this.cookie) return this.user;

    const initialRequest = await this.request(this.getEndpoint('login'), 'GET', {});

    const $ = cheerio.load(await initialRequest.text());
    const token = $('input[name="token"]').val();
    const cookie = parseCookie(initialRequest.headers.get('set-cookie') || '');

    this.cookie = cookie.PHPSESSID;
    this.token = token?.toString();

    const formdata = new URLSearchParams();
    formdata.append('username', username);
    formdata.append('password', password);
    formdata.append('token', this.token || '');
    
    const loginRequest = await this.request(this.getEndpoint("login"), "POST", {"Content-Type": "application/x-www-form-urlencoded"}, formdata.toString());

    const loginResponse = await loginRequest.text();
    const $2 = cheerio.load(loginResponse);
    const $user = $2("#navbar .right.menu :nth-child(1)")
      .text()
      .split(" ")[0]
      .replace(" ", "")
      .trim();

    let $uuid = $2("#navbar .right.menu :nth-child(1) img.ui.avatar.image").attr("src")?.split("/")[4];

    $uuid = parseUUID($uuid || '');

    if(!$user) throw new Error('Failed to login');

    this.user.username = $user;
    this.user.uuid = $uuid;

    this.verboseLog("Logged in as " + $user);

    this.event.emit("login", this.user);
    return this.user;
  }

  /**
   * Returns your CubedCraft user data if logged in,
   * if not logged in, throws an error
   */
  async getUserData(uuid: string = this.user.uuid) {
    if(!this.cookie) throw new Error('Not logged in');

    const userAPI = (await this.request("https://api.playerservers.com/player/" + uuid, "GET", {}));
    const warzone = await this.request("https://api.playerservers.com/player/" + uuid + "/warzone", "GET", {});
    const tntwars = await this.request("https://api.playerservers.com/player/" + uuid + "/tntwars", "GET", {});
    const xrun = await this.request("https://api.playerservers.com/player/" + uuid + "/xrun", "GET", {});
    const bedwars = await this.request("https://api.playerservers.com/player/" + uuid + "/bedwars", "GET", {});
    const arcade = await this.request("https://api.playerservers.com/player/" + uuid + "/arcade", "GET", {});
    const kitpvp = await this.request("https://api.playerservers.com/player/" + uuid + "/kitpvp", "GET", {});
    
    let user = await userAPI.json();
    let wzJson = await warzone.json();
    let twJson = await tntwars.json();
    let xrJson = await xrun.json();
    let bwJson = await bedwars.json();
    let acJson = await arcade.json();
    let kpJson = await kitpvp.json();

    if(user.error ||
      wzJson.error ||
      twJson.error ||
      xrJson.error ||
      bwJson.error ||
      acJson.error ||
      kpJson.error) throw new Error('Failed to get user data');
  
    user = user['player'];

    this.verboseLog("Got user data, parsing");
    
    this.user = {
      ...this.user,
      online: user['online'],
      activity: {
        first_login: user['first_join'],
        last_login: user['last_logout'],
      },
      points: user['points'],
      level: {
        exp: user['exp'],
        level: user['level'],
      },
      version: {
        protocol: user['version_protocol'],
        display: parseProtocol(user['version_protocol']),
      },
      current_server: user['server'],
      guild: user['guild_name'],
      groups: user['groups'],
      minigames: {
        warzone: {
          coins: wzJson['player']['coins'],
          kills: wzJson['player']['kills'],
          deaths: wzJson['player']['deaths'],
          wins: wzJson['player']['wins'],
          score: wzJson['player']['score'],
          wool_destroyed: wzJson['player']['wool_destroyed'],
          activity: {
            first_login: wzJson['player']['first_joined'],
            last_login: wzJson['player']['last_joined'],
            playtime: wzJson['player']['playtime'],
          },
        },
        tntwars: {
          coins: twJson['player']['coins'],
          kills: twJson['player']['kills'],
          deaths: twJson['player']['deaths'],
          wins: twJson['player']['wins'],
          score: twJson['player']['score'],
          activity: {
            first_login: twJson['player']['first_joined'],
            last_login: twJson['player']['last_joined'],
            playtime: twJson['player']['playtime'],
          },
        },
        xrun: {
          wins: xrJson['player']['wins'],
          plays: xrJson['player']['plays'],
          score: xrJson['player']['score'],
          activity: {
            first_login: xrJson['player']['first_joined'],
            last_login: xrJson['player']['last_joined'],
          },
          maps: xrJson['player']['maps'],
        },
        bedwars: {
          coins: bwJson['player']['coins'],
          kills: bwJson['player']['kills'],
          deaths: bwJson['player']['deaths'],
          wins: bwJson['player']['wins'],
          beds: bwJson['player']['beds'],
          score: bwJson['player']['score'],
          activity: {
            first_login: bwJson['player']['first_joined'],
            last_login: bwJson['player']['last_joined'],
            playtime: bwJson['player']['playtime'],
          },
        },
        arcade: {
          activity: {
            first_login: acJson['player']['first_joined'],
            last_login: acJson['player']['last_joined'],
            playtime: acJson['player']['playtime'],
          },
          maps: acJson['player']['games'],
        },
        kitpvp: {
          coins: kpJson['player']['coins'],
          kills: kpJson['player']['kills'],
          deaths: kpJson['player']['deaths'],
          score: kpJson['player']['score'],
          activity: {
            first_login: kpJson['player']['first_joined'],
            last_login: kpJson['player']['last_joined'],
            playtime: kpJson['player']['playtime'],
          },
        },
      }
    }

    return this.user;
  }

  /**
   * Returns your CubedCraft servers if logged in,
   * if not logged in, throws an error
   */
  async getServers() {
    if(!this.cookie) throw new Error('Not logged in');

    const accountRequest = await this.request(this.getEndpoint('account'), 'GET', {});
    
    const body = await accountRequest.text();
    const $ = cheerio.load(body);

    const servers: Server[] = [];

    $(".table-responsive table.table").each((i, el) => {
      const table = $(el);
      const rows = table.find("tbody tr");

      rows.each((ind, el) => {
        const row = $(el);
        const name = row.find("td:nth-child(1)").text().trim();
        const plan = row.find("td:nth-child(2)").text().trim().replace(" (Change)", "") as keyof Plan;

        const id = row.find("td:nth-child(4)")
          .find("td a")
          .attr("href")?.split("/")[4].replace("?s=", "") as string;

        servers.push({
          name,
          id: parseInt(id),
          port: 25565,
          isOwner: i === 0 ? true : false,
        });
      });
      
      this.user.servers = servers;
    });
    
    this.verboseLog("Got servers, parsing");
    return this.user.servers;
  }

  /**
   * Selects a CubedCraft server so you can interact with it
   * 
   * Automatically gets your servers if you have not already
   * 
   * If not logged in, throws an error
   * 
   * If you do not have access to the server, throws an error
   * @param id The server ID to select
   */
  async selectServer(id: any) {
    if(!this.cookie) throw new Error('Not logged in');
    
    let server;
    const servers = await this.getServers();

    if(!servers) throw new Error('No servers found');
    if(parseInt(id)) server = servers.find((s) => s.id === parseInt(id));
    else server = servers.find((s) => s.name === id);
    if(!server) throw new Error('Invalid server ID');

    const request = await this.request(this.getEndpoint('dashboard') + `?s=${server.id}`, 'GET', {});

    const body = await request.text();
    const $ = cheerio.load(body);

    let serverData: Server = {
      name: '',
      id: 0,
      port: 25565,
      motd: '',
      version: '',
      icon: "NONE",
      visible: false,
      isOwner: false,
    }

    const motd = $(".card-body form:nth-child(1) input[name='server-motd']").val();
    const version = $(".card-body form:nth-child(2) select[name='server-version']").val();
    const icon = $(".card-body form:nth-child(3) select[name='server-icon']").val();
    const visibility = $(".card-body form:nth-child(4) select[name='server-visibility']").val();

    serverData.name = server.name;
    serverData.id = server.id;
    serverData.motd = motd?.toString();
    serverData.version = version?.toString();
    serverData.icon = icon?.toString() as ServerIcon;
    serverData.visible = visibility?.toString() === "1" ? true : false;
    serverData.isOwner = true;
    
    this.user.selected_server = serverData;

    this.verboseLog("Selected server, parsing: " + serverData.name);
    return serverData;
  }

  private async setServerAttribute(attribute: ServerAttribute, value?: any) {
    if(!this.cookie) throw new Error('Not logged in');
    if(!this.user.selected_server) throw new Error('No server selected');

    const refresh = await this.request(this.getEndpoint('dashboard') + `?s=${this.user.selected_server?.id}`, 'GET', {});

    const post = new URLSearchParams();
    post.append("token", this.token || "");
    post.append("edit-file-sub", "Save");
    post.append("action", attribute);

    switch(attribute) {
      case "motd":
        post.append("server-motd", value);
        break;
      case "version":
        post.append("server-version", value);
        break;
      case "icon":
        post.append("server-icon", value);
        break;
      case "visibility":
        post.append("server-visibility", value);
        break;
      case "stop":
        post.set("action", "stop");
        break;
      case "who-can-start":
        post.append("who-can-start", value);
        break;
    }

    const request = await this.request(this.getEndpoint('dashboard'), 'POST', {"Content-Type": "application/x-www-form-urlencoded"}, post);
    
    return {
      attribute,
      value,
    }
  }

  /**
   * Sets the MOTD of the selected server
   * @param motd The MOTD to set
   * @returns 
   */
  async setMOTD(motd: string) {
    this.verboseLog("Setting MOTD to " + motd);
    this.event.emit("motd", motd);
    return await this.setServerAttribute('motd', motd);
  }

  /**
   * Sets the version of the selected server
   * @param version The version to set
   * @returns 
   */
  async setVersion(version: ServerVersion) {
    return await this.setServerAttribute('version', version);
  }

  /**
   * Sets the icon of the selected server
   * @param icon The icon to set
   * @returns 
   */
  async setIcon(icon: ServerIcon) {
    return await this.setServerAttribute('icon', icon);
  }

  /**
   * Sets the visibility of the selected server
   * @param visible The visibility to set
   * @returns 
   */
  async setVisibility(visible: boolean) {
    return await this.setServerAttribute('visibility', visible ? 1 : 0);
  }

  async setPermission(whoCanStart: ServerStartPermissions) {
    return await this.setServerAttribute('who-can-start', whoCanStart);
  }

  /**
   * Stops the selected server
   * @returns
   */
  async stopServer() {
    this.event.emit("stop");
    return await this.setServerAttribute("stop");
  }

  /**
   * Executes a command on the selected server
   * @param command The command to execute
   * @returns The command executed
   */
  async executeCommand(command: string, silent?: boolean) {
    if(!this.cookie) throw new Error('Not logged in');
    if(!this.user.selected_server) throw new Error('No server selected');

    const refresh = await this.request(this.getEndpoint('dashboard') + `?s=${this.user.selected_server?.id}`, 'GET', {});

    const post = new URLSearchParams();
    post.append("sendcmd", command);

    const request = await this.request(this.getEndpoint('console'), 'POST', {"Content-Type": "application/x-www-form-urlencoded"}, post);

    if(!silent) this.event.emit("command", command);
    return {
      command,
    }
  }

  async getFiles(path: string) {
    if(!this.cookie) throw new Error('Not logged in');
    if(!this.user.selected_server) throw new Error('No server selected');

    const refresh = await this.request(this.getEndpoint('dashboard') + `/filemanager?dir=${path}`, 'GET', {});

    const request = await this.request(this.getEndpoint('queries') + `/list_files/?dir=${path}`, 'GET', {});
    const body = await request.text();

    return JSON.parse(body);
  }

  async downloadFile(path: string, name: string) {
    if(!this.cookie) throw new Error('Not logged in');
    if(!this.user.selected_server) throw new Error('No server selected');

    const request = await this.request(this.getEndpoint('dashboard') + `/filemanager/&action=download&type=file&name=${name}&download=/${name}&dir=${path}`, 'GET', {});
    const body = await request.buffer();

    return body;
  }

  async downloadFolder(path: string, name: string) {
    if(!this.cookie) throw new Error('Not logged in');
    if(!this.user.selected_server) throw new Error('No server selected');

    const request = await this.request(this.getEndpoint('dashboard') + `/filemanager/&action=download&type=folder&name=${name}&download=/${name}&dir=${path}`, 'GET', {});
    const body = await request.buffer();

    return body;
  }

  /**
   * Creates a file to the selected server
   * @param path The path to the file to create
   * @param content The content to create
   * @param name The name of the file to create
   * @returns 
   */
  async createFile(path: string, name: string, file: string) {
    if(!this.cookie) throw new Error('Not logged in');
    if(!this.user.selected_server) throw new Error('No server selected');
    
    const refresh = await this.request(this.getEndpoint('dashboard') + `/filemanager/?action=new&dir=${path}`, 'GET', {});
    const existingFile = await this.request(this.getEndpoint('dashboard') + `/filemanager/?action=edit&medit=${path}/${name}&dir=${path}`, 'GET', {});

    const $ = cheerio.load(await refresh.text());
    let editToken = $('input[name="token"]').val();

    const $2 = cheerio.load(await existingFile.text());
    let existingName = $2("input#edit-file-name").val();

    if(existingName) return this.editFile(path, name, file);

    const post = new FormData();
    post.append("edit-file-name", name.split(".")[0]);
    post.append("ext", name.split(".")[1]);
    post.append("edit-file-content", file);
    post.append("token", editToken as string || "");
    post.append("edit-file-sub", "Submit");

    const request = await this.request(this.getEndpoint('dashboard') + `/filemanager/?action=new&dir=${path}`, 'POST', {
      "Content-Type": "multipart/form-data; boundary=" + post.getBoundary(),
    }, post);

    this.event.emit("file", {
      path,
      file,
      name
    });
    return {
      path,
      file
    }
  }

  async editFile(path: string, name: string, file: string) {
    if(!this.cookie) throw new Error('Not logged in');
    if(!this.user.selected_server) throw new Error('No server selected');
    
    const refresh = await this.request(this.getEndpoint('dashboard') + `/filemanager/?action=edit&medit=${path}/${name}&dir=${path}`, 'GET', {});
    
    const $ = cheerio.load(await refresh.text());

    let editToken = $('input[name="token"]').val();

    const post = new FormData();
    post.append("edit-file-name", name);
    post.append("edit-file-content", file);
    post.append("token", editToken as string || "");
    post.append("edit-file-sub", "Submit");

    console.log(post);

    const request = await this.request(this.getEndpoint('dashboard') + `/filemanager/?action=edit&medit=${path}/${name}&dir=${path}`, 'POST', {
      "Content-Type": "multipart/form-data; boundary=" + post.getBoundary(),
    }, post);

    this.event.emit("file", {
      path,
      file,
      name
    });
    return {
      path,
      file
    }
  } 

  // TODO: Finish
  async createServer(name: string, version: ServerVersion) {
    if(!this.cookie) throw new Error('Not logged in');

    const post = new FormData();
    post.append("token", this.token || "");
    post.append("name", name);
    post.append("version", version);

    const request = await this.request(this.getEndpoint('account') + "/new", 'POST', {}, post);

    const body = await request.text();
    const $ = cheerio.load(body);

    if(name.length < 3) throw new Error('Server name must be at least 3-16 characters long and can only contain letters and numbers');
    if(body.includes("Another server already has this name!")) throw new Error('Server name already taken');
    if(body.includes("Invalid server name")) throw new Error('Invalid server name (must be 3-16 characters long and can only contain letters and numbers)');

    return {
      name,
      version,
    }
  }

  /**
   * Installs a plugin to the selected server
   * @param name The name of the plugin to install
   * @returns The name of the plugin installed, throws an error if it fails
   */
  async installPlugin(name: string) {
    if(!this.cookie) throw new Error('Not logged in');
    if(!this.user.selected_server) throw new Error('No server selected');

    const refresh = await this.request(this.getEndpoint('dashboard') + `?s=${this.user.selected_server?.id}`, 'GET', {});

    // no post request??? thank you cubedcraft

    const request = await this.request(this.getEndpoint('dashboard') + `/plugins/?install=${name}`, 'GET', {});

    const body = await request.text();

    if(body === "OK") {
      this.event.emit("plugin", {
        action: "install",
        name,
      });
      return {
        name,
      }
    } else {
      return {
        name,
        error: "Failed to install plugin, is it already installed?"
      }
    }
  }

  /**
   * Installs multiple plugins to the selected server
   * @param names The names of the plugins to install
   */
  async installPlugins(names: string[]) {
    if(!this.cookie) throw new Error('Not logged in');
    if(!this.user.selected_server) throw new Error('No server selected');

    const refresh = await this.request(this.getEndpoint('dashboard') + `?s=${this.user.selected_server?.id}`, 'GET', {});

    names.forEach((plugin) => {
      this.installPlugin(plugin);
    })
  }

  /**
   * Uninstalls a plugin from the selected server
   * @param name The name of the plugin to uninstall
   * @returns The name of the plugin uninstalled, throws an error if it fails
   */
  async uninstallPlugin(name: string) {
    if(!this.cookie) throw new Error('Not logged in');
    if(!this.user.selected_server) throw new Error('No server selected');

    const refresh = await this.request(this.getEndpoint('dashboard') + `?s=${this.user.selected_server?.id}`, 'GET', {});

    // no post request??? thank you cubedcraft

    const request = await this.request(this.getEndpoint('dashboard') + `/plugins/?remove=${name}`, 'GET', {});

    const body = await request.text();

    if(body === "OK") {
      this.event.emit("plugin", {
        action: "uninstall",
        name,
      });
      return {
        name,
      }
    } else {
      return {
        name,
        error: "Failed to uninstall plugin, is it installed?"
      }
    }
  }

  /**
   * Uninstalls multiple plugins from the selected server
   * @param names The names of the plugins to uninstall
   */
  async uninstallPlugins(names: string[]) {
    if(!this.cookie) throw new Error('Not logged in');
    if(!this.user.selected_server) throw new Error('No server selected');

    const refresh = await this.request(this.getEndpoint('dashboard') + `?s=${this.user.selected_server?.id}`, 'GET', {});

    names.forEach((plugin) => {
      this.uninstallPlugin(plugin);
    })
  }

  async setServerProperties(properties: [ServerProperty]) {
    if(!this.cookie) throw new Error('Not logged in');
    if(!this.user.selected_server) throw new Error('No server selected');

    const refresh = await this.request(this.getEndpoint('dashboard') + `?s=${this.user.selected_server?.id}`, 'GET', {});

    const post = new FormData();
    post.append("token", this.token || "");
    post.append("action", "properties");

    for (const key in properties) {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        
      }
    }

    console.log(post);
    
    /// gibbiemonster was here
    const request = await this.request(this.getEndpoint('properties'), 'POST', {}, post);

    return {
      properties,
    }
  }

  async getCommands() {
    if(!this.cookie) return new Error('Not logged in');
    if(!this.user.selected_server) return new Error('No server selected');
    
    const refresh = await this.request(this.getEndpoint('dashboard') + `?s=${this.user.selected_server?.id}`, 'GET', {});

    const request = await this.request(this.getEndpoint('dashboard') + "/settings", 'GET', {});

    const body = await request.text();
    const $ = cheerio.load(body);

    const commands: string[] = [];

    $(".input-group.mb-3").each((i, el) => {
      const row = $(el);
      const command = row.find("input#inputCommand").val()?.toString();
      const id = row.find("input#id").attr("id")?.toString();
    });

    return commands;
  }

  async addBoostCommand(command: string) {  // no overcomplicated code here
    if(!this.cookie) return new Error('Not logged in');
    if(!this.user.selected_server) return new Error('No server selected');
    
    const refresh = await this.request(this.getEndpoint('dashboard') + `?s=${this.user.selected_server?.id}`, 'GET', {});

    const post = new FormData();
    post.append("token", this.token || "");
    post.append("action", "new_boost_command");
    post.append("new_command", command);

    const request = await this.request(this.getEndpoint('dashboard') + "/settings", 'POST', {}, post);

    this.event.emit("boostCommand", {
      action: "add",
      command,
    });
    return {
      command,
    }
  }

  async addVoteCommand(command: string) {
    if(!this.cookie) return new Error('Not logged in');
    if(!this.user.selected_server) return new Error('No server selected');
    
    const refresh = await this.request(this.getEndpoint('dashboard') + `?s=${this.user.selected_server?.id}`, 'GET', {});

    const post = new FormData();
    post.append("token", this.token || "");
    post.append("action", "new_vote_command");
    post.append("new_command", command);

    const request = await this.request(this.getEndpoint('dashboard') + "/settings", 'POST', {}, post);

    this.event.emit("voteCommand", {
      action: "add",
      command,
    });
    return {
      command,
    }
  }

  private getEndpoint(endpoint: keyof Endpoints) {
    const endpoints: Endpoints = {
      login: 'https://playerservers.com/login',
      dashboard: 'https://playerservers.com/dashboard',
      account: 'https://playerservers.com/account',
      console: 'https://playerservers.com/queries/console_backend',
      properties: 'https://playerservers.com/dashboard/properties',
      queries: 'https://playerservers.com/queries',
    };

    return endpoints[endpoint];
  }
}

export default PlayerServers;