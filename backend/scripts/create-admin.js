import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../src/config/database.js';
const [name,emailInput,password]=process.argv.slice(2);
if(!name||!emailInput||!password){console.error('Usage: npm run create-admin -- "Admin" email password');process.exit(1);}
if(password.length<12){console.error('Gunakan password admin minimal 12 karakter.');process.exit(1);}
try{
 const email=emailInput.trim().toLowerCase();
 const hash=await bcrypt.hash(password,12);
 const q=await pool.query(`INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'admin') ON CONFLICT(email) DO NOTHING RETURNING id,name,email,role`,[name.trim(),email,hash]);
 if(!q.rowCount){console.error('Email sudah terdaftar; tidak ada perubahan.');process.exitCode=1;}else console.table(q.rows);
}catch(e){console.error('Gagal membuat admin:',e.message);process.exitCode=1;}finally{await pool.end();}
