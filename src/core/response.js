'use strict';

import mime from 'mime';
import Cookie from 'think-cookie';

/**
 * response class
 */
export default class Response {
  /**
   * contructor
   */
  constructor(res){
    this.res = res;
    this._contentTypeIsSend = false;
    this._cookies = {}; // send cookies
  }
  /**
   * set content-type
   */
  type(contentType, encoding){
    if (this._contentTypeIsSend) {
      return;
    }
    if (contentType.indexOf('/') === -1) {
      contentType = mime.lookup(contentType);
    }
    if (encoding !== false && contentType.toLowerCase().indexOf('charset=') === -1) {
      contentType += '; charset=' + (encoding || think.config('encoding'));
    }
    this.header('Content-Type', contentType);
  }
  /**
   * get or set header
   * @param  {String} name  [header name]
   * @param  {String} value [header value]
   * @return {}       []
   */
  header(name, value){
    //check content type is send
    if (name.toLowerCase() === 'content-type') {
      if (this._contentTypeIsSend) {
        return;
      }
      this._contentTypeIsSend = true;
    }
    //set header
    if (!this.res.headersSent) {
      this.res.setHeader(name, value);
    }
  }
  /**
   * set http status
   * @param  {Number} status []
   * @return {}        []
   */
  status(status = 200){
    if (!this.res.headersSent) {
      this.res.statusCode = status;
    }
  }
  /**
   * set or send cookie
   */
  cookie(name, value, options){
    //send cookies
    if (name === true) {
      if (think.isEmpty(this._cookies)) {
        return;
      }
      let cookies = Object.values(this._cookies.map(item => {
        return Cookie.stringify(item.name, item.value, item);
      }));
      this.header('Set-Cookie', cookies);
      this._cookies = {};
      return;
    }
    // get cookie before set
    if(value === undefined){
      return this._cookies[name];
    }
    //set cookie
    if (typeof options === 'number') {
      options = {timeout: options};
    }
    options = think.extend({}, think.config('cookie'), options);
    if (value === null) {
      options.timeout = -1000;
    }
    if (options.timeout !== 0) {
      options.expires = new Date(Date.now() + options.timeout * 1000);
    }
    if(options.timeout > 0){
      options.maxage = options.timeout;
    }
    options.name = name;
    options.value = value;
    this._cookies[name] = options;
  }
  /**
   * set cache-control and expires header
   * @return {} []
   */
  expires(time){
    time = time * 1000;
    let date = new Date(Date.now() + time);
    this.header('Cache-Control', `max-age=${time}`);
    this.header('Expires', date.toUTCString());
  }
  /**
   * redirect
   * @param  {String} url  [redirect url]
   * @param  {Number} code []
   * @return {}      []
   */
  redirect(url, code){
    this.res.statusCode = code || 302;
    this.header('Location', url || '/');
  }
  /**
   * output with success errno & errmsg
   * @param  {Object} data    [output data]
   * @param  {String} message [errmsg]
   * @return {Promise}         [pedding promise]
   */
  success(data = '', message = ''){
    let error = this.config('error');
    let obj = {
      [error.key]: 0,
      [error.msg]: message,
      data: data
    };
    this.type(think.config('json_content_type'));
    this.end(obj);
  }
  /**
   * output with fail errno & errmsg
   * @param  {Number} errno  [error number]
   * @param  {String} errmsg [error message]
   * @param  {Object} data   [output data]
   * @return {Promise}        [pedding promise]
   */
  fail(errno, errmsg = '', data = ''){
    let obj;
    let error = this.config('error');
    if (think.isObject(errno)) {
      obj = think.extend({}, errno);
    }else{
      if(/^[A-Z\_]+$/.test(errno)){
        let msg = this.locale(errno);
        if(think.isArray(msg)){
          errno = msg[0];
          errmsg = msg[1];
        }
      }
      if (!think.isNumber(errno)) {
        data = errmsg;
        errmsg = errno;
        errno = error.default_errno;
      }
      //read errmsg from config/locale/[lang].js
      if(!errmsg){
        errmsg = this.locale(errno) || '';
      }
      obj = {
        [error.key]: errno,
        [error.msg]: errmsg
      };
      if(data){
        obj.data = data;
      }
    }
    this.type(this.config('json_content_type'));
    this.end(obj);
  }
  /**
   * output with jsonp
   * @param  {Object} data [output data]
   * @return {}      []
   */
  jsonp(data) {
    this.type(this.config('json_content_type'));
    let callback = this.get(this.config('callback_name'));
    //remove unsafe chars
    callback = callback.replace(/[^\w\.]/g, '');
    if (callback) {
      data = callback + '(' + (data !== undefined ? JSON.stringify(data) : '') + ')';
    }
    this.end(data);
  }
  /**
   * write content
   * @param  {mixed} obj      []
   * @param  {String} encoding []
   * @return {Promise}          []
   */
  write(obj, encoding){
    if(!this.res.connection){
      return;
    }
    this.type(think.config('view.content_type'));
    this.cookie(true);
    if (obj === undefined) {
      return;
    }
    if(think.isPromise(obj)){
      //ignore Content-Type header before set
      this._contentTypeIsSend = false;
      throw new Error('can not write promise');
    }
    if (think.isArray(obj) || think.isObject(obj)) {
      obj = JSON.stringify(obj);
    }else if (!think.isBuffer(obj)) {
      obj += '';
    }
    
    //write after end
    if(this._isEnd){
      if(think.isBuffer(obj)){
        think.log('write after end, content is buffer', 'WARNING');
      }else{
        let pos = obj.indexOf('\n');
        if(pos > -1){
          obj = obj.slice(0, pos) + '...';
        }
        think.log('write after end, content is `' + obj + '`', 'WARNING');
      }
      return;
    }
    let outputConfig = this.config('output_content');
    if (!outputConfig) {
      return this.res.write(obj, encoding);
    }
    let fn = think.co.wrap(outputConfig);
    let promise = fn(obj, encoding, this);
    this._outputContentPromise.push(promise);
  }
}