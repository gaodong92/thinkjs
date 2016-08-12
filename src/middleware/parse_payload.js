/**
 * parse payload
 */

import multiparty from 'multiparty';

const path = require('path');
const fs = require('fs');
const querystring = require('querystring');

const MULTIPARTY_REG = /^multipart\/(form-data|related);\s*boundary=(?:"([^"]+)"|([^;]+))$/i;

export default class ParsePayload extends think.middleware.base {
  /**
   * run
   */
  run(){
    if(!this.ctx.req.readable){
      return;
    }
    return this.parse().then(() => {
      return this.validate();
    });
  }
  /**
   * parse
   */
  parse(){
    const type = this.ctx.headers['content-type'];
    // form
    if(MULTIPARTY_REG.test(type)){
      return this.parseForm();
    }
    // single file
    const post = think.config('post');
    let filename = this.ctx.header(post.single_file_header);
    if(filename){
      return this.parseSingleFile(filename);
    }
    // json
    const types = post.json_content_type;
    if(types.indexOf(type) > -1){
      return this.parseJSON();
    }
    // querystring
    if(!type || type.indexOf('application/x-www-form-urlencoded') > -1){
      return this.parseQuerystring();
    }
  }
  /**
   * get upload path
   */
  getUploadPath(){
    let postConfig = think.config('post');
    //make upload file path
    let uploadDir = postConfig.file_upload_path;
    if(!uploadDir){
      uploadDir = think.RUNTIME_PATH + think.sep + 'upload';
    }
    think.mkdir(uploadDir);
    return uploadDir;
  }
  /**
   * get payload
   */
  getPayload(){
    let ctx = this.ctx;
    if(ctx.payload){
      return Promise.resolve(ctx.payload);    
    }
    if(!ctx.req.readable){
      return Promise.resolve(new Buffer(0));
    }
    let buffers = [];
    let deferred = think.defer();
    ctx.req.on('data', chunk => {
      buffers.push(chunk);
    });
    ctx.req.on('end', () => {
      ctx.payload = Buffer.concat(buffers);
      deferred.resolve(ctx.payload);
    });
    ctx.req.on('error', () => {
      ctx.res.statusCode = 400;
      deferred.reject(think.prevent(true));
    });
    return deferred.promise;
  }
  /**
   * parse form
   */
  parseForm(){
    let postConfig = think.config('post');
    let uploadDir = this.getUploadPath();

    let ctx = this.ctx;
    let deferred = think.defer();
    let form = new multiparty.Form({
      maxFieldsSize: postConfig.max_fields_size,
      maxFields: postConfig.max_fields,
      maxFilesSize: postConfig.max_file_size,
      uploadDir: uploadDir
    });
    //support for file with multiple="multiple"
    let files = ctx._file;
    form.on('file', (name, value) => {
      if (name in files) {
        if (!think.isArray(files[name])) {
          files[name] = [files[name]];
        }
        files[name].push(value);
      }else{
        files[name] = value;
      }
    });
    form.on('field', (name, value) => {
      ctx._post[name] = value;
    });
    form.on('close', () => {
      deferred.resolve(null);
    });
    form.on('error', err => {
      ctx.req.resume();
      ctx.res.statusCode = 400;
      //log error
      if(postConfig.log_error){
        think.log(err);
      }
      deferred.reject(think.prevent(true));
    });
    form.parse(ctx.req);
    return deferred.promise;
  }
  /**
   * parse single file
   */
  parseSingleFile(filename){
    const uploadDir = this.getUploadPath();
    let deferred = think.defer();
    let ctx = ctx.http;
    let name = think.uuid(20);
    let filepath = uploadDir + think.sep + name + path.extname(filename).slice(0, 5);
    let stream = fs.createWriteStream(filepath);
    ctx.req.pipe(stream);
    stream.on('error', err => {
      ctx.res.statusCode = 400;
      //log error
      if(think.config('post.log_error')){
        think.log(err);
      }
      deferred.reject(think.prevent(true));
    });
    stream.on('close', () => {
      ctx._file.file = {
        fieldName: 'file',
        originalFilename: filename,
        path: filepath,
        size: fs.statSync(filepath).size
      };
      deferred.resolve(null);
    });
    return deferred.promise;
  }
  /**
   * parse json
   */
  async parseJSON(){
    let buf = await this.getPayload();
    let data = buf.toString('utf8');
    try{
      data = JSON.parse(data);
    }catch(e){
      //log error
      if(think.config('post.log_error')){
        think.log(new Error('JSON.parse error, payload is not a valid JSON data'));
      }
      //if using json parse error, then use querystring parse.
      //sometimes http header has json content-type, but payload data is querystring data
      data = querystring.parse(data);
    }
    if(!think.isEmpty(data)){
      this.ctx._post = think.extend(this.ctx._post, data);
    }
  }
  /**
   * parse querystring
   */
  async parseQuerystring(){
    let buf = await this.getPayload();
    let data = buf.toString('utf8');
    this.ctx._post = think.extend(this.ctx._post, querystring.parse(data));
  }
  /**
   * validate payload
   */
  validate(){
    let ctx = this.ctx;
    let post = ctx._post;
    let length = Object.keys(post).length;
    if (length > think.config('post.max_fields')) {
      ctx.res.statusCode = 400;
      return think.prevent();
    }
    let maxFilesSize = think.config('post.max_fields_size');
    for(let name in post){
      if (post[name] && post[name].length > maxFilesSize) {
        ctx.res.statusCode = 400;
        return think.prevent();
      }
    }
  }
}