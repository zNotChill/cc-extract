
import dotenv from 'dotenv';
import cheerio from 'cheerio';
import fetch, { HeaderInit, RequestInit } from 'node-fetch';
import FormData from 'form-data';

import { parseCookie, stringifyCookie } from './lib/parse';

dotenv.config();

class PlayerServers {

  private cookie: string | null;
  private token: string | null | undefined;

  constructor() {
    this.cookie = null;
    this.token = null;
  }

  /**
   * 
   * @param url The URL to request
   * @param method The request method
   * @param headers The request headers
   * @param body The request body
   * @returns 
   */
  async request(url: string, method: RequestMethod, headers: Record<string, string>, body?: object) {
    let options: RequestInit = {
      method: method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        ...headers,
      }
    }

    console.log(options);
    
  
    if (this.cookie && options.headers) {
      options.headers['Cookie'] = stringifyCookie({
        PHPSESSID: this.cookie
      });
    }
  
    console.log(options);
    
    return await fetch(url, options);
  }

  async login(username: string, password: string) {
    if(this.cookie) return true;

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

    const loginRequest = await this.request(this.getEndpoint("login"), "POST", {}, formdata);

    const loginResponse = await loginRequest.text();

    if (loginResponse.includes('You have entered incorrect details')) {
      throw new Error('Invalid username or password');
    }

    return true;
  }

  async getServers() {
    if(!this.cookie) throw new Error('Not logged in');

    const accountRequest = await this.request(this.getEndpoint('account'), 'GET', {});
    
    const body = await accountRequest.text();
    const $ = cheerio.load(body);

    console.log(accountRequest.headers);
    
    
    $(".table-responsive table.table").each((i, el) => {
      console.log($(el).html());
    });
      
  }

  private getEndpoint(endpoint: keyof Endpoints) {
    const endpoints: Endpoints = {
      login: 'https://playerservers.com/login',
      dashboard: 'https://playerservers.com/dashboard',
      account: 'https://playerservers.com/account',
    };

    return endpoints[endpoint];
  }
}

export default PlayerServers;