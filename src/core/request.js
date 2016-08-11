'use strict';

import Cookie from 'think-cookie';

const url = require('url');

/**
 * request class
 */
export default class Request {
  /**
   * constructor
   */
  constructor(req){
    this.req = req;
    this.headers = this.req.headers;
    this.method = this.req.method;
    this._cookies = null;
  }
  /**
   * get cookie
   */
  cookie(name){
    if(!this._cookies && this.headers.cookie){
      this._cookies = Cookie.parse(this.headers.cookie);
    }
    if (name === undefined) {
      return this._cookies;
    }
    return this._cookies[name];
  }
  /**
   * get content-type
   */
  type(){
    return (this.headers['content-type'] || '').split(';')[0].trim();
  }
  /**
   * get user agent
   * @return {String} []
   */
  userAgent(){
    return this.headers['user-agent'] || '';
  }
  /**
   * get page request referrer
   * @param  {String} host [only get referrer host]
   * @return {String}      []
   */
  referrer(onlyHost = false){
    let referer = this.headers.referer || this.headers.referrer || '';
    if (!referer || !onlyHost) {
      return referer;
    }
    let info = url.parse(referer);
    return info.hostname;
  }
  /**
   * is ajax request
   * @param  {String}  method []
   * @return {Boolean}        []
   */
  isAjax(method) {
    if (method && this.method !== method.toUpperCase()) {
      return false;
    }
    return this.headers['x-requested-with'] === 'XMLHttpRequest';
  }
  /**
   * get uesr ip
   * @return {String} [ip4 or ip6]
   */
  ip(proxy, forward){
    let userIP;
    let localIP = '127.0.0.1';
    if (proxy) {
      if (forward) {
        return (this.headers['x-forwarded-for'] || '').split(',').filter(item => {
          item = item.trim();
          if (think.isIP(item)) {
            return item;
          }
        });
      }
      userIP = this.headers['x-real-ip'];
    }else{
      let connection = this.req.connection;
      let socket = this.req.socket;
      if (connection && connection.remoteAddress !== localIP) {
        userIP = connection.remoteAddress;
      }else if (socket && socket.remoteAddress !== localIP) {
        userIP = socket.remoteAddress;
      }
    }
    if (!userIP) {
      return localIP;
    }
    if (userIP.indexOf(':') > -1) {
      userIP = userIP.split(':').slice(-1)[0];
    }
    if (!think.isIP(userIP)) {
      return localIP;
    }
    return userIP;
  }
}