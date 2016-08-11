'use strict';

const path = require('path');

/**
 * Base Class with context
 * @return {Class}
 */
export default class Base {
  /**
   * init
   * @param  {Object} http []
   * @return {}      []
   */
  constructor(ctx = {}){
    this.ctx = ctx;
    this.http = ctx; // support ThinkJS 2.x
  }
  /**
   * invoke method, support __before & __after magic methods
   * @param  {String} method []
   * @param  {mixed} data []
   * @return {Promise}    []
   */
  async invoke(method, ...data){
    if (this.__before) {
      await this.__before();
    }
    // check method is exist
    if (!this[method]){
      return Promise.reject(new Error(think.locale('METHOD_NOT_EXIST', method)));
    }
    let result = await this[method](...data);
    if (this.__after) {
      await this.__after();
    }
    return result;
  }
  /**
   * get or set config
   * @param  {string} name  [config name]
   * @param  {mixed} value [config value]
   * @return {mixed}       []
   */
  config(name, value){
    return think.config(name, value);
  }
  /**
   * change module/controller/action when invoked action
   * @param  {Object} controller []
   * @param  {String} action     []
   * @return {Promise}            []
   */
  async _transMCAAction(controller, action){
    //change module/controller/action when invoke another action
    //make this.display() correct when invoked without any paramters
    let ctx = this.ctx;
    let source = {
      controller: ctx.controller,
      action: ctx.action
    };
    //@TODO controller may be has sub controllers
    ctx.controller = path.basename(controller.__filename, '.js');
    ctx.action = action;
    if (action !== '__call') {
      action = think.camelCase(action) + 'Action';
    }
    let err;
    let result = await controller.invoke(action, controller).catch(e => {
      err = e;
    });
    think.extend(ctx, source);
    return err ? Promise.reject(err) : result;
  }
  /**
   * invoke action
   * @param  {Object} controller [controller instance]
   * @param  {String} action     [action name]
   * @param  {Mixed} data       [action params]
   * @return {}            []
   */
  action(controller, action, transMCA = true){
    if (think.isString(controller)) {
      controller = this.controller(controller);
    }
    if(!transMCA){
      if (action !== '__call') {
        action = think.camelCase(action) + 'Action';
      }
      return controller.invoke(action, controller);
    }
    return this._transMCAAction(controller, action);
  }
  /**
   * get or set cache
   * @param  {String} name    [cache name]
   * @param  {mixed} value   [cache value]
   * @param  {Object} options [cache options]
   * @return {}         []
   */
  cache(name, value, options){
    return think.cache(name, value, options);
  }
  /**
   * invoke hook
   * @param  {String} event [event name]
   * @return {Promise}       []
   */
  hook(event, data){
    return think.hook.exec(event, this.ctx, data);
  }
  /**
   * get model
   * @param  {String} name    [model name]
   * @param  {Object} options [model options]
   * @return {Object}         [model instance]
   */
  model(name, options){
    return think.model(name, options);
  }
  /**
   * get controller
   * this.controller('home/controller/test')
   * @param  {String} name [controller name]
   * @return {Object}      []
   */
  controller(name){
    let Cls = think.lookClass(name, 'controller');
    return new Cls(this.http);
  }
  /**
   * get service
   * @param  {String} name [service name]
   * @return {Object}      []
   */
  service(name){
    return think.service(name);
  }
}