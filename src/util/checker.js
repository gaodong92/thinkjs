'use strict';

import fs from 'fs';
import path from 'path';

export default {
  /**
   * check node version
   * @return {} []
   */
  checkNodeVersion(){
    let packageFile = `${think.THINK_PATH}/package.json`;
    let {engines} = JSON.parse(fs.readFileSync(packageFile, 'utf-8'));
    let needVersion = engines.node.substr(2);

    let nodeVersion = process.version;
    if(nodeVersion[0] === 'v'){
      nodeVersion = nodeVersion.slice(1);
    }

    if(needVersion > nodeVersion){
      think.log(`ThinkJS need node version >= ${needVersion}, current version is ${nodeVersion}, please upgrade it.`, 'EXIT');
    }
  },
  /**
   * check application filename is lower
   * @return {} []
   */
  checkFileName(){
    let files = think.getFiles(think.APP_PATH, true);
    let reg = /\.(js|html|tpl)$/;
    let uppercaseReg = /[A-Z]+/;
    let localPath = `${think.sep}${think.dirname.locale}${think.sep}`;
    let filter = item => {
      if(!reg.test(item)){
        return;
      }
      item = path.normalize(item);
      //ignore files in config/locale
      if(item.indexOf(localPath) > -1){
        return;
      }
      return true;
    };
    files.forEach(item => {
      if(filter(item) && uppercaseReg.test(item)){
        think.log(`file \`${item}\` has uppercase chars.`, 'WARNING');
      }
    });
  },
  /**
   * check dependencies is installed before server start
   * @return {} []
   */
  checkDependencies(){
    let packageFile = think.ROOT_PATH + '/package.json';
    if(!think.isFile(packageFile)){
      return;
    }
    let data = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    let dependencies = think.extend({}, data.dependencies);
    //only merge devDependencies in development env
    if(think.env === 'development'){
      dependencies = think.extend(dependencies, data.devDependencies);
    }
    //package alias
    let pkgAlias = {
      'babel-runtime': 'babel-runtime/helpers/inherits'
    };
    let pkgPath = `${think.ROOT_PATH}${think.sep}node_modules${think.sep}`;
    for(let pkg in dependencies){
      pkg = pkgAlias[pkg] || pkg;
      if(think.isDir(`${pkgPath}${pkg}`)){
        continue;
      }
      try{
        require(pkg);
      }catch(e){
        think.log(`package \`${pkg}\` is not installed. please run \`npm install\` command before start server.`, 'EXIT');
      }
    }
  }
};