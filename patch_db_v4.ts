import fs from 'fs';
let content = fs.readFileSync('database.sql', 'utf8');

if (!content.includes('subscription_plan')) {
  let patch = `
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan text default 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS razorpay_customer_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS razorpay_subscription_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status text default 'none';
`;
  fs.writeFileSync('database.sql', content + patch);
  console.log("Appended DB changes to database.sql");
}
