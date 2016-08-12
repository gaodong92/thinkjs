'use strict';
/**
 * rewrite pathname
 * @type {}
 */
export default class RewritePathname extends think.middleware.base {
  /**
   * run
   * @return {} []
   */
  run(){
    let ctx = this.ctx;
    let pathname = ctx.pathname;
    if (!pathname || pathname === '/') {
      return;
    }
    let prefix = think.config('pathname_prefix');
    if (prefix && pathname.indexOf(prefix) === 0) {
      pathname = pathname.substr(prefix.length);
    }
    let suffix = think.config('pathname_suffix');
    if (suffix && pathname.substr(0 - suffix.length) === suffix) {
      pathname = pathname.substr(0, pathname.length - suffix.length);
    }
    ctx.pathname = pathname;
  }
}