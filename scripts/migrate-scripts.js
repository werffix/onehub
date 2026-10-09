'use strict';
const fs=require('node:fs');const path=require('node:path');const {publicId}=require('../lib/scripts');
const dir=path.resolve(process.env.DATA_DIR||path.join(__dirname,'..','data')),file=path.join(dir,'store.json');
if(!fs.existsSync(file)){console.error(`Хранилище не найдено: ${file}`);process.exit(1)}
const db=JSON.parse(fs.readFileSync(file,'utf8'));let changed=false;
for(const key of ['scripts','scriptVersions','scriptAccess','scriptDownloads','scriptInstallReports'])if(!Array.isArray(db[key])){db[key]=[];changed=true}
for(const user of db.users||[])if(!user.public_id){user.public_id=publicId();changed=true}
if(!db.adminPublicId){db.adminPublicId=publicId();changed=true}
if(!db.scriptSettings){db.scriptSettings={userScriptsEnabled:false};changed=true}
if(changed){const tmp=`${file}.tmp`;fs.writeFileSync(tmp,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(tmp,file)}
console.log(changed?'Миграция скриптов применена.':'Миграция уже применена; изменений нет.');
