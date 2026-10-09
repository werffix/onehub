'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validSlug,publicId,validateScript,renderScript,hasScriptAccess,immutableVersion}=require('../lib/scripts');

test('slug допускает латиницу, цифры, дефис и подчёркивание',()=>{assert.equal(validSlug('vpn_setup-2'),true);assert.equal(validSlug('Ключ'),false);assert.equal(validSlug('-bad'),false);assert.equal(validSlug('has space'),false);assert.equal(validSlug('a'.repeat(65)),false)});
test('public_id имеет 22 URL-safe случайных символа и уникален',()=>{const a=publicId(),b=publicId();assert.match(a,/^[A-Za-z0-9]{22}$/);assert.notEqual(a,b)});
test('публикация требует известные переменные, shebang и корректный bash',()=>{assert.equal(validateScript('#!/usr/bin/env bash\necho {{USER_PUBLIC_ID}}').ok,true);assert.match(validateScript('#!/usr/bin/env bash\necho {{UNKNOWN}}').error,/Неизвестный плейсхолдер/);assert.match(validateScript('echo no shebang').error,/Первая строка/);assert.match(validateScript('#!/usr/bin/env bash\nif').error,/bash -n/)});
test('CRLF нормализуется, draft допускает незавершённый bash',()=>{const d=validateScript('echo x\r\n',{publishing:false,runBash:false});assert.equal(d.normalized,'echo x\n');assert.match(d.warning,/нормализованы/)});
test('выдача экранирует через shell одинарные кавычки, плохие значения блокируются',()=>{const src='echo {{USER_PUBLIC_ID}} {{CLIENT_IP}}';assert.equal(renderScript(src,{USER_PUBLIC_ID:'id-123',CLIENT_IP:'127.0.0.1'}),"echo 'id-123' '127.0.0.1'");assert.throws(()=>renderScript(src,{USER_PUBLIC_ID:"x'\necho bad",CLIENT_IP:'127.0.0.1'}),/Недопустимое значение/)});
test('доступ разрешён только опубликованному не заблокированному пользователю',()=>{const script={id:'s',status:'published',access_mode:'selected'},u={id:'u',blocked:false};assert.equal(hasScriptAccess(script,u,[{script_id:'s',user_id:'u'}]),true);assert.equal(hasScriptAccess(script,{...u,blocked:true},[{script_id:'s',user_id:'u'}]),false);assert.equal(hasScriptAccess({...script,status:'draft'},u,[{script_id:'s',user_id:'u'}]),false)});
test('rollback создаёт новую immutable версию с серверным sha256',()=>{const script={id:'s',version_counter:3},v=immutableVersion(script,'#!/usr/bin/env bash\necho ok','admin','rollback');assert.equal(v.version,4);assert.match(v.sha256,/^[a-f0-9]{64}$/);assert.equal(v.content.includes('echo ok'),true)});
