'use strict';


import mime from 'mime';
import Request from './request.js';
import Response from './response.js';

const url = require('url');
const fs = require('fs');

/**
 * wrap for request & response
 * @type {Object}
 */
export default class Context {
  /**
   * constructor
   * @return {} []
   */
  constructor(req, res){
    //request object
    this.req = req;
    //response object
    this.res = res;
    this._req = new Request(req);
    this._res = new Response(res);
    //set http start time
    this.startTime = Date.now();
    this.parseRequest();
  }
  /**
   * parse properties
   * @return {} []
   */
  parseRequest(){
    this.url = this.req.url;
    this.version = this.req.httpVersion;
    this.method = this.req.method.toLowerCase();
    this.headers = this.req.headers;
    this.host = this.headers.host || ''; // with port
    this.hostname = '';
    this.pathname = '';
    this.controller = '';
    this.action = '';
    this.payload = null; //request payload, Buffer
    this.query = {};

    this._get = {};
    this._post = {};
    this._file = {};
    this._prop = {};

    this._session = null; //session instance

    //optimize for homepage request
    if(this.req.url === '/'){
      this.pathname = '/';
      let pos = this.host.indexOf(':');
      this.hostname = pos === -1 ? this.host : this.host.slice(0, pos);
    }else{
      let urlInfo = url.parse('//' + this.host + this.req.url, true, true);
      this.pathname = urlInfo.pathname;
      this.hostname = urlInfo.hostname;
      this.query = urlInfo.query;
      this._get = think.extend({}, this.query);
    }
  }
  /**
   * get or set property
   */
  prop(name, value){
    if(value === undefined){
      return this._prop[name];
    }
    this._prop[name] = value;
    return this;
  }
  /*
   * get or set config
   * @param  {string} name  [config name]
   * @param  {mixed} value [config value]
   * @return {mixed}       []
   */
  config(name, value){
    return think.config(name, value);
  }
  /**
   * get or set content type
   * @param  {String} ext [file ext]
   * @return {}     []
   */
  type(contentType, encoding){
    if (!contentType) {
      return this._req.type();
    }
    return this._res.type(contentType, encoding);
  }
  /**
   * get user agent
   * @return {String} []
   */
  userAgent(){
    return this._req.userAgent();
  }
  /**
   * get page request referrer
   * @param  {String} host [only get referrer host]
   * @return {String}      []
   */
  referrer(onlyHost = false){
    return this._req.referrer(onlyHost);
  }
  /**
   * check http method is get
   * @return {Boolean} []
   */
  isGet(){
    return this.method === 'get';
  }
  /**
   * check http method is post
   * @return {Boolean} []
   */
  isPost(){
    return this.method === 'post';
  }
  /**
   * is cli request
   * @return {Boolean} []
   */
  isCli(){
    return this._cli;
  }
  /**
   * is ajax request
   * @param  {String}  method []
   * @return {Boolean}        []
   */
  isAjax(method) {
    return this._req.isAjax(method);
  }
  /**
   * is jsonp request
   * @param  {String}  name [callback name]
   * @return {Boolean}      []
   */
  isJsonp(name){
    name = name || this.config('callback_name');
    return !!this.get(name);
  }
  /**
   * get or set get params
   * @param  {String} name []
   * @return {Object | String}      []
   */
  get(name, value){
    if (value === undefined) {
      if (name === undefined) {
        return this._get;
      }else if (think.isString(name)) {
        //may be value is false or 0
        value = this._get[name];
        if(value === undefined){
          value = '';
        }
        return value;
      }
      this._get = name;
    }else{
      this._get[name] = value;
    }
  }
  /**
   * get or set post params
   * @param  {String} name []
   * @return {Object | String}      []
   */
  post(name, value){
    if (value === undefined) {
      if (name === undefined) {
        return this._post;
      }else if (think.isString(name)) {
        //may be value is false or 0
        value = this._post[name];
        if(value === undefined){
          value = '';
        }
        return value;
      }
      this._post = name;
    }else {
      this._post[name] = value;
    }
  }
  /**
   * get post or get params
   * @param  {String} name []
   * @return {Object | String}      []
   */
  param(name){
    if (name === undefined) {
      return think.extend({}, this._get, this._post);
    }
    return this._post[name] || this._get[name] || '';
  }
  /**
   * get or set file data
   * @param  {String} name []
   * @return {Object}      []
   */
  file(name, value){
    if (value === undefined) {
      if (name === undefined) {
        return think.extend({}, this._file);
      }
      return think.extend({}, this._file[name]);
    }
    this._file[name] = value;
  }
  /**
   * get or set header
   * @param  {String} name  [header name]
   * @param  {String} value [header value]
   * @return {}       []
   */
  header(name, value){
    if(value === undefined){
      return this._req.header(name);
    }
    return this._res.header(name, value);
  }
  /**
   * set http status
   * @param  {Number} status []
   * @return {}        []
   */
  status(status = 200){
    return this._res.status(status);
  }
  /**
   * get or set language
   * @return {String}           []
   */
  lang(lang, asViewPath){
    if(lang){
      this._lang = lang;
      this._langAsViewPath = asViewPath;
      return;
    }
    //get from property
    if(this._lang){
      return this._lang;
    }
    //get from cookie
    let key = this.config('locale').cookie_name;
    let value = this.cookie(key);
    if(value){
      this._lang = value;
      return value;
    }
    //get from header
    lang = this.header('accept-language');
    //language to lowercase
    this._lang = (lang.split(',')[0] || '').toLowerCase();
    return this._lang;
  }
  /**
   * get or set theme
   * @param  {String} theme []
   * @return {String}       []
   */
  theme(theme){
    if(theme){
      this.prop('_theme', theme);
      return;
    }
    return this.prop('_theme');
  }
  /**
   * get or set cookie
   * @param  {} name    []
   * @param  {} value   []
   * @param  {} options []
   * @return {}         []
   */
  cookie(name, value, options){
    //send cookies
    if (name === true) {
      return this._res.cookie(name);
    }
    if(value === undefined){
      return this._req.cookie(name) || this._res.cookie(name);
    }
    return this._res.cookie(name, value, options);
  }
  /**
   * redirect
   * @param  {String} url  [redirect url]
   * @param  {Number} code []
   * @return {}      []
   */
  redirect(url, code){
    this._res.redirect(url, code);
    return think.prevent();
  }
  /**
   * output with success errno & errmsg
   * @param  {Object} data    [output data]
   * @param  {String} message [errmsg]
   * @return {Promise}         [pedding promise]
   */
  success(data = '', message = ''){
    return this._res.success(data, message);
  }
  /**
   * output with fail errno & errmsg
   * @param  {Number} errno  [error number]
   * @param  {String} errmsg [error message]
   * @param  {Object} data   [output data]
   * @return {Promise}        [pedding promise]
   */
  fail(errno, errmsg = '', data = ''){
    return this._res.fail(errno, errmsg, data);
  }
  /**
   * output with jsonp
   * @param  {Object} data [output data]
   * @return {}      []
   */
  jsonp(data) {
    return this._res.jsonp(data);
  }
  /**
   * output with json
   * @param  {Object} data [output data]
   * @return {Promise}      []
   */
  json(data){
    this.type(think.config('json_content_type'));
    this.end(data);
  }
  /**
   * get user ip
   */
  ip(forward){
    let proxy = think.config('proxy_on') || this.host === this.hostname;
    return this._req.ip(proxy, forward);
  }
  /**
   * get view instance
   * @return {Object} []
   */
  view(){
    if (!this._view) {
      let cls = think.require('view');
      this._view = new cls(this);
    }
    return this._view;
  }
  /**
   * set cache-control and expires header
   * @return {} []
   */
  expires(time){
    return this._res.expires(time);
  }
  /**
   * get locale value
   * @param  {String} key []
   * @return {String}     []
   */
  locale(){
    return think.locale.apply(this, arguments);
  }
   /**
   * get or set session
   * @param  {String} name  [session name]
   * @param  {mixed} value [session value]
   * @return {Promise}       []
   */
  session(name, value, options) {
    think.session(this, options);
    let instance = this._session;
    if (name === undefined) {
      return instance.delete();
    }
    if (value !== undefined) {
      return instance.set(name, value);
    }
    return instance.get(name);
  }
  /**
   * write content
   */
  write(obj, encoding = think.config('encoding')){
    return this._res.write(obj, encoding);
  }
}