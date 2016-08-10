/**
 * cache interface
 */
export default class CacheInterface {
  /**
   * constructor
   */
  constructor(options = {}){
    this.options = options;
  }
  /**
   * get cache
   * @param name [cache name]
   * @returns Promise<any>
   */
  async get(name){

  }
  /**
   * set cache
   * @param name [cache name]
   * @param value [cache value]
   * @returns Promise<void>
   */
  async set(name, value){

  }
  /**
   * delete cache
   * @param name [cache name]
   * @returns Promise<void>
   */
  async delete(name){

  }
  /**
   * cache gc
   */
  async gc(){

  }
}