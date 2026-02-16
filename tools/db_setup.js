require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run(){
  const env = process.env;
  const host = env.DB_HOST || '127.0.0.1';
  const port = parseInt(env.DB_PORT || '3306',10);
  const user = env.DB_USER;
  const pass = env.DB_PASS;
  const db = env.DB_NAME;
  if (!user || !pass || !db) return console.error('Missing DB_USER/DB_PASS/DB_NAME in .env');

  const conn = await mysql.createConnection({ host, port, user, password: pass, database: db, multipleStatements: true });
  try{
    const base = path.join(__dirname,'..','sql');
    const files = ['create_tables.sql','insert_admin.sql'];
    for(const f of files){
      const p = path.join(base,f);
      if (!fs.existsSync(p)){
        console.warn('SQL file not found:', p); continue;
      }
      const sql = fs.readFileSync(p,'utf8');
      console.log('Running', f);
      const res = await conn.query(sql);
      console.log('Done', f);
    }
    console.log('All done.');
  }catch(err){
    console.error('ERROR', err.message || err);
    process.exitCode = 1;
  }finally{
    await conn.end();
  }
}

run();
