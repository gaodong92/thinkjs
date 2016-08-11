'use strict';
/**
 * base service
 * @type {Class}
 */
export default class Service {
  /**
   * get model instance
   * @return {} []
   */
  model(name, options){
    return think.model(name, options);
  }
  /**
   * get service
   * @return {} []
   */
  service(name){
    return think.service(name);
  }
}