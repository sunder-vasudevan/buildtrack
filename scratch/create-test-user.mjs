import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = 'test@example.com';
  const password = 'password123';
  
  const { data: users, error: checkError } = await supabase.auth.admin.listUsers();
  const existingUser = users?.users?.find(u => u.email === email);
  
  if (existingUser) {
    console.log('User exists. Updating password and confirming email...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: password,
      email_confirm: true
    });
    if (updateError) console.error('Error updating:', updateError);
    else console.log('User updated! ID:', existingUser.id);
  } else {
    console.log('Creating new user...');
    const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });
    if (createError) console.error('Error creating:', createError);
    else console.log('User created! ID:', newUserData.user.id);
  }
}

main();
